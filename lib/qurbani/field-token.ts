import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";

type FieldTokenPayload = {
  packageId: string;
  poolId: string;
  taskId: string;
  expiresAt: number;
};

function secret() {
  ensureLocalEnvLoaded();
  return requiredEnv("QURBANI_TOKEN_SECRET");
}

function encode(value: FieldTokenPayload) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(`field:${payload}`).digest("base64url");
}

export function issueQurbaniFieldToken(
  input: Omit<FieldTokenPayload, "expiresAt"> & { expiresAt?: number },
) {
  const payload = encode({
    packageId: input.packageId,
    poolId: input.poolId,
    taskId: input.taskId,
    expiresAt: input.expiresAt || Date.now() + 45 * 86_400_000,
  });
  return `${payload}.${signature(payload)}`;
}

export function verifyQurbaniFieldToken(token: string) {
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;
  const expected = signature(payload);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(providedSignature);
  if (
    expectedBuffer.byteLength !== providedBuffer.byteLength ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }
  try {
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as FieldTokenPayload;
    if (
      !value.packageId ||
      !value.poolId ||
      !value.taskId ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= Date.now()
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
