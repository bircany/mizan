import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";
import { normalizePhone } from "@/lib/delivery/types";

function configuration() {
  ensureLocalEnvLoaded();
  return {
    baseUrl: requiredEnv("EVOLUTION_API_URL").replace(/\/$/, ""),
    apiKey: requiredEnv("EVOLUTION_API_KEY"),
    instanceName: process.env.EVOLUTION_INSTANCE_NAME?.trim() || "mizan-delivery",
  };
}

async function evolutionRequest(path: string, init: RequestInit) {
  const config = configuration();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    headers: {
      apikey: config.apiKey,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(body.message || body.error || `Evolution API ${response.status}`));
  }
  return body;
}

export async function sendDeliveryWhatsApp(phone: string, body: string) {
  const number = normalizePhone(phone);
  if (!number) throw new Error("WhatsApp telefon numarasi gecersiz.");
  if (!body.trim()) throw new Error("Bos WhatsApp mesaji gonderilemez.");
  const config = configuration();
  const response = await evolutionRequest(`/message/sendText/${encodeURIComponent(config.instanceName)}`, {
    method: "POST",
    body: JSON.stringify({ number, text: body, delay: 600, linkPreview: true }),
  });
  const key = response.key as Record<string, unknown> | undefined;
  return {
    providerMessageId: String(key?.id || response.messageId || ""),
    response,
  };
}

function webhookSecret() {
  ensureLocalEnvLoaded();
  return (
    process.env.DELIVERY_EVOLUTION_WEBHOOK_SECRET?.trim() ||
    process.env.QURBANI_EVOLUTION_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

export type DeliveryEvolutionWebhookVerification =
  | {
      valid: true;
      replayKey: string;
      timestamp: number;
    }
  | {
      valid: false;
      reason:
        | "missing_secret"
        | "missing_timestamp"
        | "expired_timestamp"
        | "invalid_signature";
    };

/**
 * Verifies the exact raw request body. Evolution (or the internal adapter)
 * signs `${timestamp}.${rawBody}` and sends:
 *
 *   x-mizan-timestamp: <unix seconds>
 *   x-mizan-signature: v1=<hex hmac-sha256>
 *
 * The replay key contains only a digest and is safe to persist.
 */
export function verifyDeliveryEvolutionWebhook(
  rawBody: string,
  headers: Headers,
  options: {
    now?: number;
    maxClockSkewSeconds?: number;
  } = {},
): DeliveryEvolutionWebhookVerification {
  const secret = webhookSecret();
  if (!secret) return { valid: false, reason: "missing_secret" };

  const timestampHeader = headers.get("x-mizan-timestamp")?.trim() || "";
  if (!/^\d{10}$/.test(timestampHeader)) {
    return { valid: false, reason: "missing_timestamp" };
  }
  const timestamp = Number(timestampHeader);
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const maxClockSkewSeconds = options.maxClockSkewSeconds ?? 300;
  if (
    !Number.isSafeInteger(timestamp) ||
    Math.abs(nowSeconds - timestamp) > maxClockSkewSeconds
  ) {
    return { valid: false, reason: "expired_timestamp" };
  }

  const signatureHeader = headers.get("x-mizan-signature") || "";
  const suppliedHex = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => /^v1=[a-f0-9]{64}$/i.test(part))
    ?.slice(3)
    .toLowerCase();
  if (!suppliedHex) return { valid: false, reason: "invalid_signature" };

  const expected = createHmac("sha256", secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return { valid: false, reason: "invalid_signature" };
  }

  return {
    valid: true,
    replayKey: createHash("sha256")
      .update(`${timestampHeader}:${suppliedHex}`)
      .digest("hex"),
    timestamp,
  };
}

export function mapEvolutionDeliveryStatus(value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (status.includes("read") || status === "4") return "read" as const;
  if (status.includes("deliver") || status === "3") return "delivered" as const;
  if (status.includes("sent") || status === "2") return "sent" as const;
  if (status.includes("error") || status.includes("fail")) return "failed" as const;
  return null;
}
