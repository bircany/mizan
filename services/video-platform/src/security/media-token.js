import { createHmac, timingSafeEqual } from "node:crypto";

import { HttpError } from "../errors.js";
import { decodeBase64Url, encodeBase64Url, parseJsonBuffer } from "./encoding.js";

const allowedPurposes = new Set(["stream", "download"]);

function signatureFor(payloadPart, secret) {
  return createHmac("sha256", secret).update(payloadPart).digest();
}

export function createMediaToken(claims, secret, ttlSeconds, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!allowedPurposes.has(claims.purpose)) throw new Error("Invalid media token purpose");
  const payloadPart = encodeBase64Url(JSON.stringify({
    typ: "mizan-media",
    videoId: String(claims.videoId),
    groupId: String(claims.groupId),
    purpose: claims.purpose,
    codeVersion: Number(claims.codeVersion),
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  }));
  return `${payloadPart}.${encodeBase64Url(signatureFor(payloadPart, secret))}`;
}

export function verifyMediaToken(token, secret, expected, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) throw new HttpError(401, "invalid_media_authorization", "Video yetkisi geçersiz.");
  const [payloadPart, signaturePart] = parts;
  const expectedSignature = signatureFor(payloadPart, secret);
  const actualSignature = decodeBase64Url(signaturePart, "media signature");
  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    throw new HttpError(401, "invalid_media_authorization", "Video yetkisi geçersiz.");
  }
  const payload = parseJsonBuffer(decodeBase64Url(payloadPart, "media payload"), "media payload");
  if (
    payload.typ !== "mizan-media" ||
    !allowedPurposes.has(payload.purpose) ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    payload.exp <= nowSeconds ||
    payload.exp - payload.iat > 600 ||
    payload.iat > nowSeconds + 20 ||
    String(payload.videoId) !== String(expected.videoId) ||
    payload.purpose !== expected.purpose
  ) {
    throw new HttpError(401, "expired_media_authorization", "Video yetkisinin süresi dolmuş.");
  }
  return payload;
}
