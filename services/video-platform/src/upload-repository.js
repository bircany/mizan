import { transaction } from "./db.js";
import { HttpError } from "./errors.js";
import { sha256 } from "./security/hashes.js";

export async function consumeUploadGrant(claims, upload) {
  return transaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext('mizan:video-upload-slots'))");
    const active = await client.query(
      `select count(*)::int as count
       from operation_videos
       where status = 'uploading'
         and upload_token_jti <> $1
         and (
           (
             upload_token_consumed_at is null
             and upload_token_expires_at > now()
           )
           or upload_token_consumed_at > now() - interval '24 hours'
         )`,
      [claims.jti],
    );
    if (Number(active.rows[0]?.count || 0) >= 2) {
      throw new HttpError(429, "upload_capacity_reached", "Aynı anda en fazla iki video yüklenebilir.");
    }

    const result = await client.query(
      `update operation_videos v
       set upload_token_consumed_at = now(),
           mime_type = $7,
           size_bytes = $8,
           updated_at = now()
       from operation_groups g
       join campaigns c on c.id = g.campaign_id
       where v.id::text = $1
         and v.group_id::text = $2
         and v.uploaded_by_id::text = $3
         and v.group_id = g.id
         and v.upload_token_jti = $4
         and v.upload_nonce_hash = $5
         and v.upload_token_consumed_at is null
         and v.upload_token_expires_at > now()
         and v.upload_max_bytes >= $6
         and v.status = 'uploading'
         and (
           (
             coalesce(g.operation_type::text, c.operation_type::text) = 'slaughter_video'
             and g.status in ('slaughtered', 'video_pending', 'video_ready')
             and g.slaughtered_at is not null
           )
           or (
             coalesce(g.operation_type::text, c.operation_type::text) = 'standard_video'
             and g.status in ('video_pending', 'video_ready')
           )
         )
         and (g.capacity is null or (g.confirmed_count = g.capacity and g.reserved_count = 0))
       returning v.id, v.group_id, v.upload_id, v.upload_max_bytes`,
      [
        claims.videoId,
        claims.groupId,
        claims.userId,
        claims.jti,
        sha256(claims.nonce),
        upload.size,
        upload.mimeType,
        upload.size,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      throw new HttpError(
        409,
        "upload_grant_not_consumed",
        "Upload yetkisi kullanılmış, süresi dolmuş veya grup video yüklemeye hazır değil.",
      );
    }
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(row.upload_id)) {
      throw new Error("Database upload_id is not safe for tusd storage");
    }
    return row;
  });
}

export async function finishUpload(upload) {
  const result = await transaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`mizan:tus:${upload.id}`]);
    const selected = await client.query(
      `select id, group_id, upload_id, size_bytes, mime_type, status
       from operation_videos
       where upload_id = $1
       for update`,
      [upload.id],
    );
    const video = selected.rows[0];
    if (!video) throw new HttpError(404, "upload_mapping_not_found", "Upload eşlemesi bulunamadı.");
    if (video.status === "uploaded" || video.status === "processing" || video.status === "ready") {
      return { ...video, idempotent: true };
    }
    if (
      video.status !== "uploading" ||
      Number(video.size_bytes) !== upload.size ||
      upload.offset !== upload.size
    ) {
      throw new HttpError(409, "upload_mapping_mismatch", "Tamamlanan upload kaydı beklenen bilgilerle eşleşmiyor.");
    }
    const updated = await client.query(
      `update operation_videos
       set status = 'uploaded',
           raw_storage_key = $2,
           updated_at = now()
       where id = $1 and status = 'uploading'
       returning id, group_id, upload_id, status`,
      [video.id, video.upload_id],
    );
    return updated.rows[0];
  });
  return result;
}

export async function markUploadRejected(uploadId, reason) {
  await transaction(async (client) => {
    await client.query(
      `update operation_videos
       set status = 'rejected',
           last_error = left($2, 1000),
           updated_at = now()
       where upload_id = $1 and status = 'uploading'`,
      [uploadId, reason],
    );
  });
}
