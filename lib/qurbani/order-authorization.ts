import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";

function secret() {
  ensureLocalEnvLoaded();
  return process.env.QURBANI_TOKEN_SECRET?.trim() || requiredEnv("PAYLOAD_SECRET");
}

export function createQurbaniOrderAuthorization(orderId: string | number, ttlSeconds = 86_400) {
  const payload = Buffer.from(JSON.stringify({ orderId: String(orderId), exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyQurbaniOrderAuthorization(token: string | undefined, orderId: string) {
  if (!token) return false;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return false;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(supplied, "base64url"); } catch { return false; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return String(value.orderId) === orderId && Number(value.exp) >= Math.floor(Date.now() / 1000);
  } catch { return false; }
}
