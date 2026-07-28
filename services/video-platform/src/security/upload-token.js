import { createPublicKey, verify as verifySignature } from "node:crypto";

import { HttpError } from "../errors.js";
import { decodeBase64Url, parseJsonBuffer } from "./encoding.js";

const supportedMimeTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const supportedRoles = new Set(["admin", "field_operator"]);
const identifierPattern = /^[A-Za-z0-9_-]{1,128}$/;

function publicKeyFrom(value) {
  const pem = value.includes("BEGIN PUBLIC KEY")
    ? value
    : Buffer.from(value, "base64").toString("utf8");
  return createPublicKey(pem);
}

function matchesAudience(claim, expected) {
  return typeof claim === "string"
    ? claim === expected
    : Array.isArray(claim) && claim.some((entry) => entry === expected);
}

function integerClaim(payload, name) {
  if (!Number.isSafeInteger(payload[name])) {
    throw new HttpError(401, "invalid_upload_token", `Upload token ${name} alanı geçersiz.`);
  }
  return payload[name];
}

function identifierClaim(payload, name) {
  const value = String(payload[name] ?? "");
  if (!identifierPattern.test(value)) {
    throw new HttpError(401, "invalid_upload_token", `Upload token ${name} alanı geçersiz.`);
  }
  return value;
}

export function verifyUploadToken(token, config, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new HttpError(401, "invalid_upload_token", "Upload yetkisi geçersiz.");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = parseJsonBuffer(decodeBase64Url(headerPart, "header"), "header");
  const payload = parseJsonBuffer(decodeBase64Url(payloadPart, "payload"), "payload");

  if (header.alg !== "EdDSA" || header.typ !== "JWT") {
    throw new HttpError(401, "invalid_upload_token", "Upload yetkisi algoritması geçersiz.");
  }
  if (config.keyId && header.kid !== config.keyId) {
    throw new HttpError(401, "invalid_upload_token", "Upload yetkisi anahtar kimliği geçersiz.");
  }
  const signature = decodeBase64Url(signaturePart, "signature");
  const verified = verifySignature(
    null,
    Buffer.from(`${headerPart}.${payloadPart}`),
    publicKeyFrom(config.publicKey),
    signature,
  );
  if (!verified) throw new HttpError(401, "invalid_upload_token", "Upload yetkisi imzası geçersiz.");

  const issuedAt = integerClaim(payload, "iat");
  const expiresAt = integerClaim(payload, "exp");
  if (
    payload.iss !== config.issuer ||
    !matchesAudience(payload.aud, config.audience) ||
    issuedAt > nowSeconds + config.clockToleranceSeconds ||
    expiresAt <= nowSeconds - config.clockToleranceSeconds ||
    expiresAt - issuedAt <= 0 ||
    expiresAt - issuedAt > config.maxTokenLifetimeSeconds
  ) {
    throw new HttpError(401, "expired_upload_token", "Upload yetkisinin süresi dolmuş veya kapsamı geçersiz.");
  }
  if (payload.nbf !== undefined && integerClaim(payload, "nbf") > nowSeconds + config.clockToleranceSeconds) {
    throw new HttpError(401, "invalid_upload_token", "Upload yetkisi henüz geçerli değil.");
  }

  const role = String(payload.role ?? "");
  if (!supportedRoles.has(role)) {
    throw new HttpError(403, "invalid_upload_role", "Bu rol video yükleyemez.");
  }
  const maxBytes = integerClaim(payload, "maxBytes");
  if (maxBytes <= 0 || maxBytes > config.maxBytes) {
    throw new HttpError(413, "upload_too_large", "Upload yetkisindeki dosya sınırı geçersiz.");
  }
  const allowedMimeClaim = payload.allowedMime ?? payload.mimeTypes;
  const allowedMime = Array.isArray(allowedMimeClaim)
    ? [...new Set(allowedMimeClaim.map(String))]
    : [String(allowedMimeClaim ?? "")];
  if (
    allowedMime.length === 0 ||
    allowedMime.some((mime) => !supportedMimeTypes.has(mime))
  ) {
    throw new HttpError(415, "unsupported_media_type", "Upload yetkisindeki video türü geçersiz.");
  }

  return Object.freeze({
    userId: identifierClaim(payload, "sub"),
    role,
    groupId: identifierClaim(payload, "groupId"),
    videoId: identifierClaim(payload, "videoId"),
    jti: identifierClaim(payload, "jti"),
    nonce: identifierClaim(payload, "nonce"),
    maxBytes,
    allowedMime,
    issuedAt,
    expiresAt,
  });
}

export const uploadMimeTypes = supportedMimeTypes;
