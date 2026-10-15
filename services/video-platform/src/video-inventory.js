import { unlink } from "node:fs/promises";

import { query, transaction } from "./db.js";
import { HttpError } from "./errors.js";
import { resolveExistingFile, resolveStorageKey } from "./storage.js";

const cleanableStatuses = new Set(["superseded", "rejected", "expired", "failed", "processing_failed", "quarantined"]);

export function canCleanVideo(video) {
  return cleanableStatuses.has(video.status) && !video.is_active &&
    String(video.active_video_id ?? "") !== String(video.id) &&
    !video.physical_deleted_at && Number(video.pending_messages || 0) === 0;
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

async function removeIfPresent(root, key) {
  if (!key) return;
  try {
    const file = await resolveExistingFile(root, key);
    await unlink(file.path);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.statusCode !== 404) throw error;
  }
}

export async function cleanStoredVideo(videoId, storage, actorId) {
  if (!/^\d+$/.test(String(videoId))) throw new HttpError(400, "invalid_video_id", "Video kimliği geçersiz.");
  if (!/^\d+$/.test(String(actorId))) throw new HttpError(400, "invalid_actor_id", "Yönetici kimliği geçersiz.");
  return transaction(async (client) => {
    const selected = await client.query(
      `select v.id, v.group_id, v.status, v.is_active, v.physical_deleted_at,
              v.upload_id, v.raw_storage_key, v.processed_storage_key,
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
    await removeIfPresent(storage.uploads, video.upload_id);
    if (video.upload_id) {
      await unlink(resolveStorageKey(storage.uploads, `${video.upload_id}.info`)).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      });
    }
    await removeIfPresent(storage.raw, video.raw_storage_key);
    await removeIfPresent(storage.quarantine, video.raw_storage_key);
    await removeIfPresent(storage.ready, video.processed_storage_key);
    await removeIfPresent(storage.replaced, video.processed_storage_key);
    await client.query(
      `update operation_videos set status = 'deleted', is_active = false,
         physical_deleted_at = now(), updated_at = now(),
         technical_metadata = coalesce(technical_metadata, '{}'::jsonb)
           || jsonb_build_object('adminCleanedAt', now(), 'adminCleanedBy', $2::text)
       where id = $1`,
      [video.id, String(actorId)],
    );
    return { videoId: String(video.id), groupId: String(video.group_id), cleaned: true };
  });
}
