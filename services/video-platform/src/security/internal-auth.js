import { createHmac, timingSafeEqual } from "node:crypto";

import { HttpError } from "../errors.js";

function expectedSignature(timestamp, body, secret) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest("hex");
}

export function verifyInternalRequest(headers, body, config, nowSeconds = Math.floor(Date.now() / 1000)) {
  const timestamp = headers["x-mizan-timestamp"];
  const supplied = headers["x-mizan-signature"];
  if (!/^\d{10}$/.test(String(timestamp || "")) || !/^v1=[a-f0-9]{64}$/i.test(String(supplied || ""))) {
    throw new HttpError(401, "invalid_internal_signature", "Servis imzası geçersiz.");
  }
  if (Math.abs(nowSeconds - Number(timestamp)) > config.internalSignatureMaxAgeSeconds) {
    throw new HttpError(401, "expired_internal_signature", "Servis imzasının süresi dolmuş.");
  }
  const expected = Buffer.from(expectedSignature(timestamp, body, config.internalSecret), "hex");
  const actual = Buffer.from(String(supplied).slice(3), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new HttpError(401, "invalid_internal_signature", "Servis imzası geçersiz.");
  }
}
