import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { ensureLocalEnvLoaded } from "@/lib/env";

export type QurbaniCheckoutEnvelope = {
  v: 1;
  kid: string;
  alg: "A256GCM";
  iv: string;
  tag: string;
  data: string;
};

function checkoutKey() {
  ensureLocalEnvLoaded();
  const raw = process.env.QURBANI_CHECKOUT_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("QURBANI_CHECKOUT_ENCRYPTION_KEY yapılandırılmamış.");
  }
  const key = /^[a-f\d]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.byteLength !== 32) {
    throw new Error(
      "QURBANI_CHECKOUT_ENCRYPTION_KEY 32 bayt base64 veya 64 karakter hex olmalıdır.",
    );
  }
  return {
    key,
    kid: process.env.QURBANI_CHECKOUT_ENCRYPTION_KEY_VERSION?.trim() || "v1",
  };
}

export function encryptQurbaniCheckoutPii(value: unknown) {
  const { key, kid } = checkoutKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope: QurbaniCheckoutEnvelope = {
    v: 1,
    kid,
    alg: "A256GCM",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: encrypted.toString("base64url"),
  };
  return JSON.stringify(envelope);
}

export function decryptQurbaniCheckoutPii<T>(serialized: string): T {
  const envelope = JSON.parse(serialized) as Partial<QurbaniCheckoutEnvelope>;
  if (
    envelope.v !== 1 ||
    envelope.alg !== "A256GCM" ||
    !envelope.iv ||
    !envelope.tag ||
    !envelope.data
  ) {
    throw new Error("Geçersiz kurban checkout şifreli veri zarfı.");
  }
  const { key, kid } = checkoutKey();
  if (envelope.kid !== kid) {
    throw new Error(`Checkout şifreleme anahtarı sürümü bulunamadı: ${envelope.kid}`);
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
