import { randomUUID } from "node:crypto";

import { HttpError, publicError } from "./errors.js";
import { logger } from "./logger.js";

export function requestId(request) {
  const supplied = request.headers["x-request-id"];
  return typeof supplied === "string" && /^[A-Za-z0-9._-]{8,80}$/.test(supplied)
    ? supplied
    : randomUUID();
}

export async function readBody(request, maxBytes = 256 * 1024) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBytes) throw new HttpError(413, "body_too_large", "İstek gövdesi çok büyük.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function parseJsonBody(buffer) {
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid_json", "Geçersiz JSON gövdesi.");
  }
}

export function sendJson(response, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(body);
}

export function corsHeaders(origin, allowedOrigins) {
  if (!origin) return {};
  if (!allowedOrigins.has(origin)) throw new HttpError(403, "origin_not_allowed", "Bu origin için erişim izni yok.");
  return {
    "access-control-allow-origin": origin,
    vary: "Origin",
  };
}

export function clientIp(request, trustProxy) {
  const forwarded = request.headers["x-forwarded-for"];
  if (trustProxy && typeof forwarded === "string") {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  return String(request.socket.remoteAddress || "unknown").slice(0, 80);
}

export function handleHttpError(response, error, id) {
  const result = publicError(error);
  if (!(error instanceof HttpError)) {
    logger.error("Unhandled API request error", {
      requestId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
  sendJson(response, result.statusCode, result.payload, { "x-request-id": id });
}
