import { initializeAccessMaterials } from "./access-materials.js";
import { accessMaterialsConfig } from "./config.js";
import { transaction } from "./db.js";
import { dispatchGroup, prepareDeliveryDrafts } from "./delivery-control-service.js";

// The operator confirms the group and recipients before uploading. Technical
// validation still happens in the video worker before this path can dispatch.
export async function findPendingAutomaticDelivery() {
  return transaction(async (client) => {
    const result = await client.query(
      `select v.id
       from operation_videos v
       join operation_groups g on g.id = v.group_id
       where v.field_checklist->'dispatch'->>'requested' = 'true'
         and v.status in ('review_pending', 'ready')
         and (v.retry_after is null or v.retry_after <= now())
         and g.dispatch_state = 'idle'
         and not exists (
           select 1 from operation_videos newer
           where newer.group_id = v.group_id and newer.version > v.version
             and newer.status not in ('rejected', 'failed', 'processing_failed', 'quarantined', 'deleted')
         )
       order by v.created_at, v.id
       limit 1`,
    );
    return result.rows[0]?.id || null;
  });
}

export async function completeAutomaticDelivery(videoId) {
  const activation = await transaction(async (client) => {
    const selected = await client.query(
      `select v.*, g.confirmed_count, g.code as group_code,
              g.dispatch_state, g.active_video_id
       from operation_videos v
       join operation_groups g on g.id = v.group_id
       where v.id = $1
       for update of v, g`,
      [videoId],
    );
    const video = selected.rows[0];
    const intent = video?.field_checklist?.dispatch;
    if (!video || intent?.requested !== true) return null;
    if (!["review_pending", "ready"].includes(video.status)) return null;
    if (video.dispatch_state !== "idle") return null;
    const newer = await client.query(
      `select id from operation_videos
       where group_id = $1 and version > $2
         and status not in ('rejected', 'failed', 'processing_failed', 'quarantined', 'deleted')
       limit 1`,
      [video.group_id, video.version],
    );
    if (newer.rowCount) return null;
    if (Number(video.confirmed_count) !== Number(intent.confirmedCount) || video.group_code !== intent.groupCode) {
      throw new Error("Grup veya bağışçı listesi yükleme sonrasında değişti; otomatik gönderim durduruldu.");
    }
    if (!video.processed_storage_key || !video.processed_sha256) {
      throw new Error("Teknik kontrolden geçmiş video bulunamadı.");
    }
    if (video.status === "review_pending") {
      await client.query(
        `update operation_videos
         set status = 'superseded', is_active = false, updated_at = now()
         where group_id = $1 and id <> $2 and is_active = true`,
        [video.group_id, video.id],
      );
      await client.query(
        `update operation_videos
         set status = 'ready', content_review_status = 'approved',
             review_checklist = $2::jsonb, reviewed_at = now(),
             reviewed_by_id = uploaded_by_id, is_active = true,
             ready_at = coalesce(ready_at, now()), retry_after = null,
             last_error = null, last_error_code = null, updated_at = now()
         where id = $1`,
        [video.id, JSON.stringify({ operatorConfirmedBeforeUpload: true, automaticTechnicalValidation: true })],
      );
      await client.query(
        `update delivery_messages set status = 'cancelled', updated_at = now()
         where group_id = $1 and video_id <> $2 and is_test = false
           and status in ('draft', 'countdown', 'queued', 'paused', 'failed')`,
        [video.group_id, video.id],
      );
      await client.query(
        `update operation_groups
         set active_video_id = $2, status = 'video_ready', dispatch_state = 'idle',
             expires_at = coalesce($3::timestamptz, now() + interval '3 months'),
             dispatch_locked_at = null, dispatch_locked_by = null,
             test_message_invalidated_at = now(), updated_at = now()
         where id = $1`,
        [video.group_id, video.id, video.expires_at],
      );
    } else if (String(video.active_video_id) !== String(video.id)) {
      throw new Error("Grubun aktif videosu değişti; otomatik gönderim durduruldu.");
    }
    return { groupId: video.group_id, scheduledAt: intent.scheduledAt || null };
  });
  if (!activation) return null;
  await initializeAccessMaterials(activation.groupId, accessMaterialsConfig());
  await prepareDeliveryDrafts(activation.groupId);
  return dispatchGroup(activation.groupId, "queue", {
    automatic: true,
    scheduledAt: activation.scheduledAt,
  });
}

export async function delayAutomaticDelivery(videoId, error) {
  await transaction((client) => client.query(
    `update operation_videos
     set retry_after = now() + interval '1 minute',
         last_error = $2, last_error_code = 'AUTO_DISPATCH_FAILED', updated_at = now()
     where id = $1 and status in ('review_pending', 'ready')`,
    [videoId, error instanceof Error ? error.message.slice(0, 1000) : "Gönderim hazırlanamadı."],
  ));
}
