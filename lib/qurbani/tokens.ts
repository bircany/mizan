import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";

function tokenSecret() {
  ensureLocalEnvLoaded();
  return process.env.QURBANI_TOKEN_SECRET?.trim() || requiredEnv("PAYLOAD_SECRET");
}

export function issueQurbaniAccessToken() {
  const nonce = randomBytes(32).toString("base64url");
  const signature = createHmac("sha256", tokenSecret()).update(nonce).digest("base64url");
  const token = `${nonce}.${signature}`;
  return { token, digest: digestQurbaniAccessToken(token) };
}

export function digestQurbaniAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyQurbaniAccessToken(token: string) {
  const [nonce, supplied] = token.split(".");
  if (!nonce || !supplied) return false;
  const expected = createHmac("sha256", tokenSecret()).update(nonce).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(supplied, "base64url");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
