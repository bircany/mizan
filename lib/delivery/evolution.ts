import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { ensureLocalEnvLoaded } from "@/lib/env";

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
      method: "hmac" | "native-secret";
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

  const nativeHeader = headers.get("x-evolution-webhook-secret")?.trim() || "";
  if (nativeHeader) {
    const expected = Buffer.from(secret, "utf8");
    const actual = Buffer.from(nativeHeader, "utf8");
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return { valid: false, reason: "invalid_signature" };
    }
    let replayMaterial = rawBody;
    try {
      const parsed = JSON.parse(rawBody) as Record<string, any>;
      const data = parsed?.data || parsed;
      replayMaterial = [
        parsed?.instance || parsed?.instanceName || "",
        parsed?.event || parsed?.type || "",
        data?.key?.id || data?.messageId || data?.id || "",
        data?.status || data?.update?.status || "",
      ].join(":");
    } catch {
      // Invalid JSON is rejected by the route after authentication.
    }
    return {
      valid: true,
      replayKey: createHash("sha256").update(replayMaterial).digest("hex"),
      timestamp: Math.floor((options.now ?? Date.now()) / 1000),
      method: "native-secret",
    };
  }

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
    method: "hmac",
  };
}

export function mapEvolutionDeliveryStatus(value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (status.includes("read") || status === "4") return "read" as const;
  if (status.includes("deliver") || status === "3") return "delivered" as const;
  if (status.includes("sent") || status === "2") return "sent" as const;
  if (status.includes("error") || status.includes("fail"))
    return "failed" as const;
  return null;
}
