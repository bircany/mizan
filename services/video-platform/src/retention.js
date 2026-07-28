import { unlink } from "node:fs/promises";

import { query, transaction } from "./db.js";
import { diskStatus } from "./disk.js";
import { logger } from "./logger.js";
import { moveFile, resolveExistingFile, resolveStorageKey } from "./storage.js";

async function removeStoredFile(root, key) {
  try {
    const file = await resolveExistingFile(root, key);
    await unlink(file.path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT" || error?.statusCode === 404) return false;
    throw error;
  }
}

export async function expireActiveVideos() {
  const result = await query(
    `update operation_videos v
     set status = 'expired',
         is_active = false,
         expired_at = coalesce(expired_at, now()),
         updated_at = now()
     where v.status = 'ready'
       and v.is_active = true
       and v.expires_at <= now()
       and not exists (
         select 1
         from delivery_messages m
         where m.video_id = v.id
           and m.status in ('sent', 'delivered', 'read', 'manual_sent')
       )
       and v.ready_at > now() - interval '45 days'
     returning v.id`,
  );
  const normalExpiry = await query(
    `update operation_videos v
     set status = 'expired',
         is_active = false,
         expired_at = coalesce(expired_at, now()),
         updated_at = now()
     where v.status = 'ready'
       and v.is_active = true
       and v.expires_at <= now()
       and exists (
         select 1
         from delivery_messages m
         where m.video_id = v.id
           and m.status in ('sent', 'delivered', 'read', 'manual_sent')
       )
     returning v.id`,
  );
  return (result.rowCount || 0) + (normalExpiry.rowCount || 0);
}

export async function flagUnsentVideosForReview() {
  const result = await query(
    `update operation_groups g
     set status = 'action_required',
         field_notes = concat_ws(E'\n', nullif(g.field_notes, ''), 'Video 45 gündür gönderilmedi; retention öncesi manuel inceleme gerekli.'),
         updated_at = now()
     from operation_videos v
     where v.group_id = g.id
       and v.is_active = true
       and v.status = 'ready'
       and v.ready_at <= now() - interval '45 days'
       and not exists (
         select 1 from delivery_messages m
         where m.video_id = v.id
           and m.status in ('sent', 'delivered', 'read', 'manual_sent')
       )
       and g.status <> 'action_required'
     returning g.id`,
  );
  return result.rowCount || 0;
}

export async function deleteSuccessfulRaw(storage) {
  const result = await query(
    `select id, raw_storage_key
     from operation_videos
     where status in ('review_pending', 'ready', 'superseded', 'expired')
       and raw_delete_after <= now()
       and coalesce(technical_metadata->>'rawDeletedAt', '') = ''
     order by raw_delete_after, id
     limit 20`,
  );
  let deleted = 0;
  for (const video of result.rows) {
    await removeStoredFile(storage.raw, video.raw_storage_key);
    await query(
      `update operation_videos
       set technical_metadata = coalesce(technical_metadata, '{}'::jsonb)
           || jsonb_build_object('rawDeletedAt', now()),
           updated_at = now()
       where id = $1`,
      [video.id],
    );
    deleted += 1;
  }
  return deleted;
}

export async function stageSupersededFiles(storage) {
  const result = await query(
    `select id, processed_storage_key
     from operation_videos
     where status = 'superseded'
       and physical_deleted_at is null
       and processed_storage_key is not null
       and coalesce(technical_metadata->>'replacedMovedAt', '') = ''
     order by id
     limit 20`,
  );
  let moved = 0;
  for (const video of result.rows) {
    try {
      const source = await resolveExistingFile(storage.ready, video.processed_storage_key);
      await moveFile(source.path, resolveStorageKey(storage.replaced, video.processed_storage_key));
    } catch (error) {
      if (!(error?.code === "ENOENT" || error?.statusCode === 404)) throw error;
    }
    await query(
      `update operation_videos
       set processed_delete_after = least(processed_delete_after, now() + interval '7 days'),
           technical_metadata = coalesce(technical_metadata, '{}'::jsonb)
             || jsonb_build_object('replacedMovedAt', now()),
           updated_at = now()
       where id = $1`,
      [video.id],
    );
    moved += 1;
  }
  return moved;
}

export async function deleteSupersededFiles(storage) {
  const result = await query(
    `select id, processed_storage_key
     from operation_videos
     where status = 'superseded'
       and processed_delete_after <= now()
       and physical_deleted_at is null
     order by processed_delete_after, id
     limit 20`,
  );
  let deleted = 0;
  for (const video of result.rows) {
    await removeStoredFile(storage.replaced, video.processed_storage_key);
    await query(
      `update operation_videos
       set status = 'deleted', physical_deleted_at = now(), updated_at = now()
       where id = $1 and status = 'superseded'`,
      [video.id],
    );
    deleted += 1;
  }
  return deleted;
}

export async function deleteExpiredFiles(storage) {
  const result = await query(
    `select id, processed_storage_key
     from operation_videos
     where status = 'expired'
       and expired_at <= now() - interval '7 days'
       and physical_deleted_at is null
       and is_active = false
     order by expired_at, id
     limit 20`,
  );
  let deleted = 0;
  for (const video of result.rows) {
    await removeStoredFile(storage.ready, video.processed_storage_key);
    await query(
      `update operation_videos
       set status = 'deleted', physical_deleted_at = now(), updated_at = now()
       where id = $1 and status = 'expired' and is_active = false`,
      [video.id],
    );
    deleted += 1;
  }
  return deleted;
}

export async function deleteQuarantineFiles(storage) {
  const result = await query(
    `select id, raw_storage_key
     from operation_videos
     where status = 'quarantined'
       and quarantine_until <= now()
       and physical_deleted_at is null
     order by quarantine_until, id
     limit 20`,
  );
  let deleted = 0;
  for (const video of result.rows) {
    await removeStoredFile(storage.quarantine, video.raw_storage_key);
    await query(
      `update operation_videos
       set status = 'deleted', physical_deleted_at = now(), updated_at = now()
       where id = $1 and status = 'quarantined'`,
      [video.id],
    );
    deleted += 1;
  }
  return deleted;
}

export async function deleteStaleTusUploads(storage) {
  const result = await query(
    `select id, upload_id
     from operation_videos
     where status = 'uploading'
       and (
         (upload_token_consumed_at is null and upload_token_expires_at <= now())
         or upload_token_consumed_at <= now() - interval '24 hours'
       )
     order by coalesce(upload_token_consumed_at, upload_token_expires_at), id
     limit 20`,
  );
  let deleted = 0;
  for (const video of result.rows) {
    await removeStoredFile(storage.uploads, video.upload_id);
    await unlink(resolveStorageKey(storage.uploads, `${video.upload_id}.info`)).catch(() => {});
    await query(
      `update operation_videos
       set status = 'rejected',
           last_error_code = 'UPLOAD_EXPIRED',
           last_error = 'Yarım kalan upload için 24 saatlik devam süresi sona erdi.',
           updated_at = now()
       where id = $1 and status = 'uploading'`,
      [video.id],
    );
    deleted += 1;
  }
  return deleted;
}

export async function redactOldDeliveryData() {
  const result = await query(
    `update delivery_messages
     set recipient_phone = null,
         normalized_phone = null,
         body = null,
         body_snapshot = null,
         message_snapshot = null,
         redacted_at = coalesce(redacted_at, now()),
         updated_at = now()
     where redacted_at is null
       and coalesce(sent_at, delivered_at, read_at, failed_at, manual_sent_at) <= now() - interval '7 days'
       and status in ('sent', 'delivered', 'read', 'failed', 'manual_sent')`,
  );
  return result.rowCount || 0;
}

export async function cleanupWebhookReplayKeys() {
  const result = await query(
    `delete from api_rate_limits
     where updated_at < now() - interval '24 hours'
       and rate_limit_key like 'delivery-webhook:%'`,
  );
  return result.rowCount || 0;
}

export async function runRetentionCycle(storage, thresholds) {
  const disk = await diskStatus(storage.processing, thresholds);
  if (disk.warning) {
    logger.warn("Video disk free space is below warning threshold", {
      freeBytes: disk.freeBytes,
      uploadsBlocked: disk.uploadsBlocked,
    });
  }
  const results = {
    disk,
    staleUploads: await deleteStaleTusUploads(storage),
    rawDeleted: await deleteSuccessfulRaw(storage),
    quarantineDeleted: await deleteQuarantineFiles(storage),
    supersededStaged: await stageSupersededFiles(storage),
    supersededDeleted: await deleteSupersededFiles(storage),
    unsentFlagged: await flagUnsentVideosForReview(),
    expired: await expireActiveVideos(),
    expiredDeleted: await deleteExpiredFiles(storage),
    messagesRedacted: await redactOldDeliveryData(),
    webhookReplayKeysDeleted: await cleanupWebhookReplayKeys(),
  };
  return results;
}
