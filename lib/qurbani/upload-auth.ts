import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";

export type QurbaniUploadGrant = {
  videoId: string;
  poolId: string;
  fieldTaskId: string;
  userId: string;
  exp: number;
};

function secret() {
  ensureLocalEnvLoaded();
  return process.env.QURBANI_UPLOAD_SECRET?.trim() || requiredEnv("PAYLOAD_SECRET");
}

export function createQurbaniUploadGrant(input: Omit<QurbaniUploadGrant, "exp">, ttlSeconds = 30 * 60) {
  const payload = Buffer.from(JSON.stringify({ ...input, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyQurbaniUploadGrant(token: string): QurbaniUploadGrant | null {
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(supplied, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as QurbaniUploadGrant;
    if (!value.videoId || !value.poolId || !value.fieldTaskId || !value.userId || value.exp < Math.floor(Date.now() / 1000)) return null;
    return value;
  } catch {
    return null;
  }
}
