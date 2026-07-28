import crypto from "crypto";

import { requiredEnv } from "@/lib/env";

type EftUploadClaims = {
  intentId: number;
  sessionId: number;
  expiresAt: string;
};

function secret() {
  return requiredEnv("PAYLOAD_SECRET");
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function createEftUploadToken(claims: EftUploadClaims) {
  const body = encode(JSON.stringify(claims));
  const signature = crypto
    .createHmac("sha256", secret())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyEftUploadToken(
  token: string,
  expectedIntentId: number,
): EftUploadClaims | null {
  const [body, received] = token.split(".");
  if (!body || !received) return null;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(body)
    .digest("base64url");
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  if (
    receivedBytes.length !== expectedBytes.length ||
    !crypto.timingSafeEqual(receivedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as EftUploadClaims;
    if (
      claims.intentId !== expectedIntentId ||
      new Date(claims.expiresAt).getTime() <= Date.now()
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
