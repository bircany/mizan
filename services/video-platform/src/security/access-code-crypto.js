import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function decodePart(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encrypted access code");
  return Buffer.from(value, "base64url");
}

export function encryptAccessCode(code, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("mizan-access-code:v1"));
  const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptAccessCode(encoded, key) {
  const [version, ivPart, ciphertextPart, tagPart] = String(encoded || "").split(".");
  if (version !== "v1" || !ivPart || !ciphertextPart || !tagPart) throw new Error("Invalid encrypted access code");
  const iv = decodePart(ivPart);
  const ciphertext = decodePart(ciphertextPart);
  const tag = decodePart(tagPart);
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid encrypted access code");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from("mizan-access-code:v1"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
