import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { pipeline } from "node:stream/promises";

import { getGroupLanding, authorizeMedia, verifyGroupAccess } from "./access-service.js";
import { initializeAccessMaterials, rotateAccessCode } from "./access-materials.js";
import {
  accessMaterialsConfig,
  apiConfig,
  retentionConfig,
  safeTestRecipientsConfig,
  storageConfig,
  uploadConfig,
} from "./config.js";
import { databaseHealth } from "./db.js";
import { diskStatus } from "./disk.js";
import { HttpError } from "./errors.js";
import {
  corsHeaders,
  handleHttpError,
  parseJsonBody,
  readBody,
  requestId,
  sendJson,
} from "./http-utils.js";
import { logger } from "./logger.js";
import { verifyInternalRequest } from "./security/internal-auth.js";
import { verifyMediaToken } from "./security/media-token.js";
import { installShutdown } from "./shutdown.js";
import {
  contentDisposition,
  ensureStorageDirectories,
  openFileStream,
  parseSingleRange,
  resolveExistingFile,
} from "./storage.js";
import { apiDatabaseReadiness, enqueueSafeTestMessage, listSafeTestRecipients } from "./test-message-service.js";
import { dispatchTusHook } from "./tusd-hooks.js";

const api = apiConfig();
const uploads = uploadConfig();
const storage = storageConfig();
const retention = retentionConfig();
const safeTestRecipients = safeTestRecipientsConfig();
const accessMaterials = accessMaterialsConfig();

function hookAuthenticated(url, request) {
  const querySecret = url.searchParams.get("secret") || "";
  const bearer = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const supplied = querySecret || bearer;
  const expected = Buffer.from(uploads.hookSecret);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function mediaPurpose(url) {
  return url.searchParams.get("disposition") === "attachment" ? "download" : "stream";
}

async function serveMedia(request, response, url, id, originHeaders) {
  const purpose = mediaPurpose(url);
  const authorization = url.searchParams.get("authorization") || "";
  const media = await authorizeMedia(
    id,
    authorization,
    purpose,
    (token, expected) => verifyMediaToken(token, api.mediaSecret, expected),
  );
  const filename = `${String(media.code || "MIZAN").replace(/[^A-Za-z0-9_-]/g, "-")}.mp4`;
  if (api.deliveryMode === "x-accel") {
    response.writeHead(200, {
      ...originHeaders,
      "accept-ranges": "bytes",
      "cache-control": "private, no-store",
      "content-disposition": contentDisposition(purpose === "download" ? "attachment" : "inline", filename),
      "content-type": "video/mp4",
      "cross-origin-resource-policy": "cross-origin",
      "referrer-policy": "no-referrer",
      "x-accel-redirect": `${api.xAccelPrefix}/${encodeURIComponent(media.processed_storage_key)}`,
      "x-content-type-options": "nosniff",
    });
    response.end();
    return;
  }
  if (api.deliveryMode !== "node") throw new Error("MEDIA_DELIVERY_MODE must be node or x-accel");

  const file = await resolveExistingFile(storage.ready, media.processed_storage_key);
  let range;
  try {
    range = parseSingleRange(request.headers.range, file.stat.size);
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 416) {
      response.setHeader("content-range", `bytes */${file.stat.size}`);
    }
    throw error;
  }
  const length = range ? range.end - range.start + 1 : file.stat.size;
  response.writeHead(range ? 206 : 200, {
    ...originHeaders,
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
    "content-disposition": contentDisposition(purpose === "download" ? "attachment" : "inline", filename),
    "content-length": length,
    "content-type": "video/mp4",
    "cross-origin-resource-policy": "cross-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    ...(range ? { "content-range": `bytes ${range.start}-${range.end}/${file.stat.size}` } : {}),
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  await pipeline(openFileStream(file.path, range), response);
}

const abortController = new AbortController();
await ensureStorageDirectories(storage, ["uploads", "ready"], false);

const server = createServer(async (request, response) => {
  const id = requestId(request);
  response.setHeader("x-request-id", id);
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const origin = typeof request.headers.origin === "string" ? request.headers.origin : "";

    if (request.method === "GET" && url.pathname === "/healthz") {
      const [database, disk] = await Promise.all([
        databaseHealth().catch(() => false),
        diskStatus(storage.uploads, retention),
      ]);
      sendJson(response, database ? 200 : 503, {
        status: database ? "ok" : "degraded",
        database,
        disk: {
          freeBytes: disk.freeBytes,
          warning: disk.warning,
          uploadsBlocked: disk.uploadsBlocked,
        },
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/readyz") {
      const ready = await apiDatabaseReadiness();
      sendJson(response, ready ? 200 : 503, { ready });
      return;
    }

    if (request.method === "POST" && url.pathname === "/internal/tusd/hooks") {
      if (!hookAuthenticated(url, request)) throw new HttpError(401, "invalid_hook_secret", "Tus hook yetkisi geçersiz.");
      const body = await readBody(request, 1024 * 1024);
      const payload = parseJsonBody(body);
      const hookName = String(request.headers["hook-name"] || "");
      const result = await dispatchTusHook(payload, hookName, {
        uploadConfig: uploads,
        retentionConfig: retention,
        storage,
      });
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "OPTIONS" && url.pathname.startsWith("/v1/media/")) {
      const headers = corsHeaders(origin, api.allowedOrigins);
      response.writeHead(204, {
        ...headers,
        "access-control-allow-headers": "content-type,range",
        "access-control-allow-methods": "GET,HEAD,POST,OPTIONS",
        "access-control-max-age": "3600",
      });
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/access/verify") {
      const raw = await readBody(request, 16 * 1024);
      verifyInternalRequest(request.headers, raw, api);
      const body = parseJsonBody(raw);
      const result = await verifyGroupAccess({
        linkToken: body.linkToken,
        accessCode: body.accessCode,
        ip: String(request.headers["x-mizan-client-ip"] || "unknown").slice(0, 80),
      }, api);
      sendJson(response, 200, result);
      return;
    }

    const groupMatch = /^\/v1\/groups\/([A-Za-z0-9_-]{32,160})$/.exec(url.pathname);
    if (request.method === "GET" && groupMatch) {
      const raw = Buffer.alloc(0);
      verifyInternalRequest(request.headers, raw, api);
      sendJson(response, 200, await getGroupLanding(groupMatch[1]));
      return;
    }

    const mediaMatch = /^\/v1\/media\/([A-Za-z0-9_-]{1,128})$/.exec(url.pathname);
    if ((request.method === "GET" || request.method === "HEAD") && mediaMatch) {
      const headers = corsHeaders(origin, api.allowedOrigins);
      await serveMedia(request, response, url, mediaMatch[1], headers);
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/internal/test-recipients") {
      const raw = Buffer.alloc(0);
      verifyInternalRequest(request.headers, raw, api);
      sendJson(response, 200, { recipients: listSafeTestRecipients(safeTestRecipients) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/internal/test-messages") {
      const raw = await readBody(request, 32 * 1024);
      verifyInternalRequest(request.headers, raw, api);
      const result = await enqueueSafeTestMessage(parseJsonBody(raw), safeTestRecipients);
      sendJson(response, 202, result);
      return;
    }

    const initializeMatch = /^\/v1\/internal\/groups\/(\d+)\/access-materials$/.exec(url.pathname);
    if (request.method === "POST" && initializeMatch) {
      const raw = await readBody(request, 16 * 1024);
      verifyInternalRequest(request.headers, raw, api);
      sendJson(response, 200, await initializeAccessMaterials(initializeMatch[1], accessMaterials));
      return;
    }

    const rotateMatch = /^\/v1\/internal\/groups\/(\d+)\/access-code\/rotate$/.exec(url.pathname);
    if (request.method === "POST" && rotateMatch) {
      const raw = await readBody(request, 16 * 1024);
      verifyInternalRequest(request.headers, raw, api);
      const body = parseJsonBody(raw);
      sendJson(response, 200, await rotateAccessCode(rotateMatch[1], body.actorId, accessMaterials));
      return;
    }

    throw new HttpError(404, "not_found", "Endpoint bulunamadı.");
  } catch (error) {
    if (!response.headersSent) handleHttpError(response, error, id);
    else response.destroy(error instanceof Error ? error : undefined);
  }
});

server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 1_000;
server.listen(api.port, api.host, () => {
  logger.info("Video API listening", {
    host: api.host,
    port: api.port,
    allowedOrigins: [...api.allowedOrigins],
    mediaDeliveryMode: api.deliveryMode,
    safeTestRecipientCount: safeTestRecipients.size,
  });
});

abortController.signal.addEventListener("abort", () => server.close());
installShutdown(abortController);
