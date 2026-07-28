import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { withDatabaseTransaction } from "@/lib/database";
import { ensureLocalEnvLoaded } from "@/lib/env";

export const dynamic = "force-dynamic";

const maximumCallbackBodyBytes = 256 * 1024;

type VideoCallback = {
  type?:
    | "upload.completed"
    | "upload.rejected"
    | "processing.started"
    | "processing.failed"
    | "video.ready";
  eventId?: string;
  occurredAt?: string;
  videoId?: string | number;
  groupId?: string | number;
  uploadId?: string;
  error?: {
    code?: string;
    message?: string;
  };
  metadata?: {
    sizeBytes?: number;
    durationSeconds?: number;
    detectedMimeType?: string;
    container?: string;
    videoCodec?: string;
    audioCodec?: string;
    width?: number;
    height?: number;
    sha256Checksum?: string;
    rawChecksum?: string;
    processedChecksum?: string;
  };
};

function callbackSecret() {
  ensureLocalEnvLoaded();
  const value = process.env.DELIVERY_VIDEO_CALLBACK_SECRET?.trim();
  if (!value) throw new Error("DELIVERY_VIDEO_CALLBACK_SECRET yapılandırılmamış.");
  return value;
}

function callbackTimestamp(request: Request) {
  const raw = request.headers.get("x-mizan-timestamp") || "";
  const numeric = Number(raw);
  const milliseconds = Number.isFinite(numeric)
    ? numeric > 10_000_000_000 ? numeric : numeric * 1000
    : Date.parse(raw);
  if (!Number.isFinite(milliseconds)) return null;
  return new Date(milliseconds);
}

function validSignature(request: Request, rawBody: string) {
  const rawTimestamp = request.headers.get("x-mizan-timestamp") || "";
  const timestamp = callbackTimestamp(request);
  if (!timestamp || Math.abs(Date.now() - timestamp.getTime()) > 5 * 60_000) return false;
  const supplied = request.headers.get("x-mizan-signature") || "";
  const expected = `v1=${createHmac("sha256", callbackSecret())
    .update(`${rawTimestamp}.${rawBody}`)
    .digest("hex")}`;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function finiteNumber(value: unknown, minimum = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : null;
}

function shortText(value: unknown, length = 160) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, length)
    : null;
}

function safeTechnicalMetadata(metadata: VideoCallback["metadata"]) {
  return {
    detectedMimeType: shortText(metadata?.detectedMimeType, 100),
    container: shortText(metadata?.container, 100),
    videoCodec: shortText(metadata?.videoCodec, 100),
    audioCodec: shortText(metadata?.audioCodec, 100),
    width: finiteNumber(metadata?.width),
    height: finiteNumber(metadata?.height),
    durationSeconds: finiteNumber(metadata?.durationSeconds),
    sizeBytes: finiteNumber(metadata?.sizeBytes, 1),
    sha256Checksum: shortText(metadata?.sha256Checksum, 128),
    rawChecksum: shortText(metadata?.rawChecksum, 128),
    processedChecksum: shortText(metadata?.processedChecksum, 128),
  };
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumCallbackBodyBytes
  ) {
    return json({ ok: false }, 413);
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maximumCallbackBodyBytes) {
    return json({ ok: false }, 413);
  }
  const callback = (() => {
    try {
      return JSON.parse(rawBody) as VideoCallback & {
        Type?: unknown;
        Event?: unknown;
      };
    } catch {
      return null;
    }
  })();
  if (!callback) return json({ ok: false }, 400);

  // tusd must call the VDS-internal video-api hook directly. This public
  // endpoint only accepts small, signed lifecycle callbacks from video-api.
  if (callback.Type || callback.Event) {
    return json({
      ok: false,
      error: "tusd hook hedefi VDS içindeki /internal/tusd/hooks olmalıdır.",
    }, 410);
  }

  try {
    if (!validSignature(request, rawBody)) return json({ ok: false }, 401);
  } catch (error) {
    console.error("Delivery callback authentication is not configured.", error);
    return json({ ok: false }, 503);
  }

  const videoId = Number(callback.videoId);
  const groupId = Number(callback.groupId);
  const uploadId = shortText(callback.uploadId, 100);
  const eventId = shortText(callback.eventId, 160);
  const occurredAt = callback.occurredAt && Number.isFinite(Date.parse(callback.occurredAt))
    ? new Date(callback.occurredAt)
    : callbackTimestamp(request) || new Date();
  if (
    !callback.type ||
    !eventId ||
    !Number.isInteger(videoId) ||
    videoId <= 0 ||
    !Number.isInteger(groupId) ||
    groupId <= 0 ||
    !uploadId
  ) return json({ ok: false }, 400);

  const metadata = safeTechnicalMetadata(callback.metadata);
  const errorMessage = shortText(callback.error?.message, 1000);
  try {
    const updated = await withDatabaseTransaction(async (client) => {
      await client.query(
        "select pg_advisory_xact_lock(hashtext($1))",
        [`delivery-video-callback:${eventId}`],
      );
      const duplicate = await client.query(
        `select 1
         from public.audit_logs
         where action = $1
           and target_collection = 'operation-videos'
           and target_id = $2
           and details ->> 'eventId' = $3
         limit 1`,
        [`delivery.callback.${callback.type}`, String(videoId), eventId],
      );
      if (duplicate.rowCount) return true;

      let result;
      const identity = [videoId, groupId, uploadId];
      switch (callback.type) {
        case "upload.completed":
          result = await client.query(
            `update public.operation_videos
             set status = 'uploaded',
                 size_bytes = coalesce($4, size_bytes),
                 detected_mime_type = coalesce($5, detected_mime_type),
                 container_format = coalesce($6, container_format),
                 video_codec = coalesce($7, video_codec),
                 audio_codec = coalesce($8, audio_codec),
                 width = coalesce($9, width),
                 height = coalesce($10, height),
                 duration_seconds = coalesce($11, duration_seconds),
                 raw_sha256 = coalesce($12, $13, raw_sha256),
                 technical_metadata = coalesce(technical_metadata, '{}'::jsonb) || $14::jsonb,
                 updated_at = now()
             where id = $1 and group_id = $2 and upload_id = $3
               and status in ('uploading', 'uploaded')
             returning id`,
            [
              ...identity,
              metadata.sizeBytes,
              metadata.detectedMimeType,
              metadata.container,
              metadata.videoCodec,
              metadata.audioCodec,
              metadata.width,
              metadata.height,
              metadata.durationSeconds,
              metadata.sha256Checksum,
              metadata.rawChecksum,
              JSON.stringify(metadata),
            ],
          );
          break;
        case "upload.rejected":
          result = await client.query(
            `update public.operation_videos
             set status = 'quarantined',
                 last_error = $4,
                 last_error_code = $5,
                 processing_failed_at = $6,
                 quarantine_until = $6 + interval '24 hours',
                 updated_at = now()
             where id = $1 and group_id = $2 and upload_id = $3
               and status in ('uploading', 'uploaded', 'rejected', 'quarantined')
             returning id`,
            [
              ...identity,
              errorMessage || "VDS teknik video doğrulaması başarısız.",
              shortText(callback.error?.code, 100) || "technical_validation_failed",
              occurredAt,
            ],
          );
          break;
        case "processing.started":
          result = await client.query(
            `update public.operation_videos
             set status = 'processing',
                 processing_started_at = coalesce(processing_started_at, $4),
                 last_error = null,
                 updated_at = now()
             where id = $1 and group_id = $2 and upload_id = $3
               and status in ('uploaded', 'processing')
             returning id`,
            [...identity, occurredAt],
          );
          break;
        case "processing.failed":
          result = await client.query(
            `update public.operation_videos
             set status = 'processing_failed',
                 processing_failed_at = $4,
                 quarantine_until = $4 + interval '24 hours',
                 last_error = $5,
                 last_error_code = $6,
                 updated_at = now()
             where id = $1 and group_id = $2 and upload_id = $3
               and status in ('uploaded', 'processing', 'failed', 'processing_failed')
             returning id`,
            [
              ...identity,
              occurredAt,
              errorMessage || "Video işleme başarısız.",
              shortText(callback.error?.code, 100) || "ffmpeg_failed",
            ],
          );
          break;
        case "video.ready":
          result = await client.query(
            `update public.operation_videos
             set status = 'review_pending',
                 raw_delete_after = $4 + interval '3 days',
                 processed_delete_after = $4 + interval '97 days',
                 duration_seconds = coalesce($5, duration_seconds),
                 processed_sha256 = coalesce($6, processed_sha256),
                 technical_metadata = coalesce(technical_metadata, '{}'::jsonb) || $7::jsonb,
                 last_error = null,
                 last_error_code = null,
                 updated_at = now()
             where id = $1 and group_id = $2 and upload_id = $3
               and status in ('processing', 'review_pending')
             returning id`,
            [
              ...identity,
              occurredAt,
              metadata.durationSeconds,
              metadata.processedChecksum,
              JSON.stringify(metadata),
            ],
          );
          break;
      }
      if (!result?.rowCount) return false;
      await client.query(
        `insert into public.audit_logs (
           action, actor_email, target_collection, target_id, details, ip_address
         ) values ($1, 'video-api@mizan.internal', 'operation-videos', $2, $3::jsonb, null)`,
        [
          `delivery.callback.${callback.type}`,
          String(videoId),
          JSON.stringify({
            eventId,
            groupId,
            uploadId,
            occurredAt: occurredAt.toISOString(),
            errorCode: shortText(callback.error?.code, 100),
          }),
        ],
      );
      return true;
    });
    return updated ? json({ ok: true }) : json({ ok: false }, 409);
  } catch (error) {
    console.error("Delivery video callback could not be applied.", error);
    return json({ ok: false }, 500);
  }
}
