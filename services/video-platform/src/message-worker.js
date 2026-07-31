import { randomInt } from "node:crypto";

import {
  accessMaterialsConfig,
  deliveryPolicyConfig,
  messageWorkerConfig,
  safeTestRecipientsConfig,
} from "./config.js";
import {
  checkEvolutionHealth,
  EvolutionError,
  lookupEvolutionMessage,
  sendEvolutionText,
} from "./evolution-client.js";
import { heartbeat } from "./heartbeat.js";
import { logger } from "./logger.js";
import {
  claimDeliveryMessage,
  claimAmbiguousProviderLookup,
  markDeliveryFailed,
  markDeliverySent,
  pauseAllForSystemFailures,
  quarantineStaleSending,
  recordAmbiguousLookup,
  recordProviderHealth,
  releaseDeliveryClaim,
} from "./message-repository.js";
import { renderDeliveryMessage } from "./message-renderer.js";
import { installShutdown } from "./shutdown.js";

const config = messageWorkerConfig();
const deliveryPolicy = deliveryPolicyConfig();
const materials = accessMaterialsConfig();
const safeTestRecipients = safeTestRecipientsConfig();
const abortController = new AbortController();
const heartbeatPath = process.env.HEALTH_FILE || "/tmp/mizan-message-worker.health";
const healthIntervalMs = Number.parseInt(process.env.EVOLUTION_HEALTH_INTERVAL_MS || "30000", 10);
let nextHealthCheckAt = 0;
let providerHealthy = false;
let lastStaleCheckAt = 0;

if (!Number.isSafeInteger(healthIntervalMs) || healthIntervalMs < 30_000 || healthIntervalMs > 300_000) {
  throw new Error("EVOLUTION_HEALTH_INTERVAL_MS must be between 30000 and 300000");
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    abortController.signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

function recipientPhone(message) {
  if (message.is_test) {
    const safe = safeTestRecipients.get(String(message.test_number_key || ""));
    if (!safe) throw new EvolutionError("permanent", "Güvenli test alıcısı VDS allowlist içinde bulunamadı.");
    return safe.phone;
  }
  return String(message.normalized_phone || message.recipient_phone || "").replace(/\D/g, "");
}

function failureFrom(error) {
  if (error instanceof EvolutionError) {
    return {
      kind: error.kind,
      publicMessage:
        error.kind === "permanent"
          ? "Alıcı telefon numarası veya WhatsApp hesabı geçersiz."
          : error.kind === "ambiguous"
            ? "Sağlayıcı sonucu belirsiz. Mesaj doğrulanmadan yeniden gönderilmeyecek."
            : "WhatsApp servisi geçici olarak yanıt vermedi.",
      code: `EVOLUTION_${error.kind.toUpperCase()}`,
      providerStatus: error.status ? `http_${error.status}` : error.kind,
      payload: error.payload,
    };
  }
  return {
    kind: "system",
    publicMessage: "Mesaj işlenirken beklenmeyen bir sistem hatası oluştu.",
    code: "MESSAGE_WORKER_SYSTEM_ERROR",
    providerStatus: "worker_error",
    payload: {},
  };
}

async function refreshProviderHealth() {
  const health = await checkEvolutionHealth(config);
  providerHealthy = health.healthy;
  await recordProviderHealth(health);
  nextHealthCheckAt = Date.now() + healthIntervalMs;
  if (!health.healthy) logger.warn("Evolution is unhealthy; queues require manual resume", { state: health.state });
}

installShutdown(abortController);
await heartbeat(heartbeatPath);
logger.info("Message worker started", {
  workerId: config.workerId,
  safeTestRecipientCount: safeTestRecipients.size,
  evolutionUrl: config.evolutionUrl,
  requireTestBeforeDispatch: deliveryPolicy.requireTestBeforeDispatch,
});

while (!abortController.signal.aborted) {
  let claim;
  try {
    await heartbeat(heartbeatPath);
    if (Date.now() >= nextHealthCheckAt) await refreshProviderHealth();
    if (Date.now() - lastStaleCheckAt >= 60_000) {
      const stale = await quarantineStaleSending(config.leaseMinutes);
      if (stale > 0) logger.warn("Stale sending messages moved to ambiguous manual review", { count: stale });
      lastStaleCheckAt = Date.now();
    }
    if (!providerHealthy) {
      await sleep(Math.min(config.pollIntervalMs, Math.max(500, nextHealthCheckAt - Date.now())));
      continue;
    }

    if (config.lookupPath) {
      const ambiguous = await claimAmbiguousProviderLookup();
      if (ambiguous) {
        const lookup = await lookupEvolutionMessage(ambiguous.provider_message_id, config);
        await recordAmbiguousLookup(ambiguous.id, lookup);
        logger.info("Ambiguous provider result checked before any retry", {
          messageId: ambiguous.id,
          found: lookup.found,
        });
        continue;
      }
    }

    claim = await claimDeliveryMessage(
      config.workerId,
      config.leaseMinutes,
      deliveryPolicy.requireTestBeforeDispatch,
    );
    if (!claim) {
      await sleep(config.pollIntervalMs);
      continue;
    }
    const text = renderDeliveryMessage(claim.message, claim.group, materials);
    const provider = await sendEvolutionText(recipientPhone(claim.message), text, config);
    const randomDelay = randomInt(config.minDelayMs, config.maxDelayMs + 1);
    const pace = await markDeliverySent(claim, provider, {
      delayMs: randomDelay,
      batchSize: config.batchSize,
      batchPauseMs: config.batchPauseMs,
    });
    logger.info("WhatsApp message accepted by provider", {
      messageId: claim.message.id,
      groupId: claim.message.group_id,
      isTest: claim.message.is_test,
      sentInBatch: pace.sentCount,
      nextDelayMs: pace.delayMs,
    });
    await sleep(pace.delayMs);
    await heartbeat(heartbeatPath);
  } catch (error) {
    if (claim) {
      const failure = failureFrom(error);
      const result = await markDeliveryFailed(claim, failure).catch((databaseError) => {
        logger.error("Failed to persist message failure", {
          messageId: claim.message.id,
          error: databaseError.message,
        });
        return null;
      });
      if (failure.kind === "ambiguous") {
        providerHealthy = false;
        await recordProviderHealth({ healthy: false }).catch(() => {});
        nextHealthCheckAt = Date.now() + healthIntervalMs;
      } else if (failure.kind === "system") {
        await pauseAllForSystemFailures().catch(() => {});
      }
      logger.error("WhatsApp delivery failed", {
        messageId: claim.message.id,
        groupId: claim.message.group_id,
        failureKind: failure.kind,
        retryScheduled: result?.retryScheduled,
        error: error instanceof Error ? error.message : String(error),
      });
    } else {
      logger.error("Message worker loop failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(config.pollIntervalMs);
  } finally {
    await releaseDeliveryClaim(claim);
  }
}
