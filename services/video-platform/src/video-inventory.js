import { query, transaction } from "./db.js";
import { HttpError } from "./errors.js";

const cleanableStatuses = new Set(["superseded", "rejected", "expired", "failed", "processing_failed", "quarantined"]);

export function canCleanVideo(video) {
  return cleanableStatuses.has(video.status) && !video.is_active &&
    String(video.active_video_id ?? "") !== String(video.id) &&
    !video.physical_deleted_at && !video.cleanup_requested_at &&
    Number(video.pending_messages || 0) === 0;
}

export async function listStoredVideos(cursor = null) {
  const before = cursor === null ? null : Number(cursor);
  if (before !== null && (!Number.isSafeInteger(before) || before < 1)) {
    throw new HttpError(400, "invalid_cursor", "Liste imleci geçersiz.");
  }
  const result = await query(
    `select v.id, v.group_id, g.code as group_code, v.status, v.is_active,
            v.created_at, v.updated_at, v.physical_deleted_at,
            v.raw_storage_key is not null as has_raw,
            v.processed_storage_key is not null as has_processed,
            nullif(v.technical_metadata->>'adminCleanupRequestedAt', '') as cleanup_requested_at,
            g.active_video_id,
            (select count(*) from delivery_messages m where m.video_id = v.id
              and m.status in ('draft', 'countdown', 'queued', 'sending', 'paused', 'failed')) as pending_messages
     from operation_videos v
     join operation_groups g on g.id = v.group_id
     where ($1::bigint is null or v.id < $1)
       and v.physical_deleted_at is null
     order by v.id desc limit 51`,
    [before],
  );
  const more = result.rows.length > 50;
  const videos = result.rows.slice(0, 50).map((video) => ({
    id: String(video.id),
    groupId: String(video.group_id),
    groupCode: video.group_code,
    status: video.status,
    createdAt: video.created_at,
    hasRaw: video.has_raw,
    hasProcessed: video.has_processed,
    canClean: canCleanVideo(video),
  }));
  return { videos, nextCursor: more ? videos.at(-1).id : null };
}

export async function requestStoredVideoCleanup(videoId, actorId, runTransaction = transaction) {
  if (!/^\d+$/.test(String(videoId))) throw new HttpError(400, "invalid_video_id", "Video kimliği geçersiz.");
  if (!/^\d+$/.test(String(actorId))) throw new HttpError(400, "invalid_actor_id", "Yönetici kimliği geçersiz.");
  return runTransaction(async (client) => {
    const selected = await client.query(
      `select v.id, v.group_id, v.status, v.is_active, v.physical_deleted_at,
              v.upload_id, v.raw_storage_key, v.processed_storage_key,
              nullif(v.technical_metadata->>'adminCleanupRequestedAt', '') as cleanup_requested_at,
              g.active_video_id,
              (select count(*) from delivery_messages m where m.video_id = v.id
                and m.status in ('draft', 'countdown', 'queued', 'sending', 'paused', 'failed')) as pending_messages
       from operation_videos v join operation_groups g on g.id = v.group_id
       where v.id::text = $1 for update of v, g`,
      [String(videoId)],
    );
    const video = selected.rows[0];
    if (!video) throw new HttpError(404, "video_not_found", "Video bulunamadı.");
    if (!canCleanVideo(video)) {
      throw new HttpError(409, "video_in_use", "Aktif veya gönderim bekleyen video temizlenemez.");
    }
    await client.query(
      `update operation_videos set updated_at = now(),
         technical_metadata = coalesce(technical_metadata, '{}'::jsonb) || jsonb_build_object(
           'adminCleanupRequestedAt', now(), 'adminCleanupRequestedBy', $2::text
         )
       where id = $1`,
      [video.id, String(actorId)],
    );
    return { videoId: String(video.id), groupId: String(video.group_id), cleanupQueued: true };
  });
}
