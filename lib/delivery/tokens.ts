import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";

type VideoTokenClaims = {
  kind: "donor" | "stream";
  messageId: string;
  videoId: string;
  exp: number;
};

function secret() {
  ensureLocalEnvLoaded();
  return process.env.DELIVERY_TOKEN_SECRET?.trim() || requiredEnv("PAYLOAD_SECRET");
}

function sign(encoded: string) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

function encodeClaims(claims: VideoTokenClaims) {
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function issueDonorVideoToken(input: {
  messageId: string | number;
  videoId: string | number;
  expiresAt?: Date;
}) {
  const expiresAt = input.expiresAt ?? new Date(Date.now() + 365 * 86_400_000);
  const token = encodeClaims({
    kind: "donor",
    messageId: String(input.messageId),
    videoId: String(input.videoId),
    exp: Math.floor(expiresAt.getTime() / 1000),
  });
  return { token, digest: digestDeliveryToken(token), expiresAt };
}

export function issueStreamToken(claims: Pick<VideoTokenClaims, "messageId" | "videoId">, ttlSeconds = 300) {
  return encodeClaims({
    ...claims,
    kind: "stream",
    exp: Math.floor(Date.now() / 1000) + Math.max(30, Math.min(ttlSeconds, 900)),
  });
}

export function digestDeliveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyDeliveryToken(token: string, expectedKind: VideoTokenClaims["kind"]) {
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return null;
  const expected = Buffer.from(sign(encoded), "base64url");
  let actual: Buffer;
  try {
    actual = Buffer.from(supplied, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as VideoTokenClaims;
    if (
      claims.kind !== expectedKind ||
      !claims.messageId ||
      !claims.videoId ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return claims;
  } catch {
    return null;
  }
}
