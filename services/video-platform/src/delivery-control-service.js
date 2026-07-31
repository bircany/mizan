import { createHash, randomBytes, randomUUID } from "node:crypto";

import { initializeAccessMaterials } from "./access-materials.js";
import { transaction } from "./db.js";
import { HttpError } from "./errors.js";
import { computeGroupMessageFingerprint } from "./message-fingerprint.js";
import { createMediaToken } from "./security/media-token.js";

const ffmpegLockName = "mizan:video-ffmpeg:v1";

function numericId(value, label) {
  const normalized = String(value || "");
  if (!/^\d+$/.test(normalized)) {
    throw new HttpError(400, `invalid_${label}_id`, `${label} kimliği geçersiz.`);
  }
  return Number(normalized);
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function editableMessageBody(template, values) {
  const aliases = {
    ad: values.names.join(", "),
    name: values.names.join(", "),
    kampanya: values.campaignName,
    campaign: values.campaignName,
    grup_kodu: values.groupCode,
    groupCode: values.groupCode,
    video_linki: "",
    videoUrl: "",
    erisim_kodu: "",
    accessCode: "",
  };
  const rendered = String(template || "")
    .replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}|\{\s*([A-Za-z0-9_]+)\s*\}/g, (match, a, b) => (
      Object.hasOwn(aliases, a || b) ? aliases[a || b] : match
    ))
    .replace(/(?:Video bağlantısı|Video linki|Erişim kodu)\s*:\s*(?:\n|$)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return (rendered || "Bağışınıza ait videonuz hazırlanmıştır. Allah hayrınızı kabul etsin.").slice(0, 2000);
}

export async function createReviewSession(videoIdValue, config) {
  const videoId = numericId(videoIdValue, "video");
  return transaction(async (client) => {
    const result = await client.query(
      `select v.id, v.group_id, v.status, v.processed_storage_key,
              g.access_code_rotation_count
       from operation_videos v
       join operation_groups g on g.id = v.group_id
       where v.id = $1
         and v.status in ('review_pending', 'ready')
         and v.processed_storage_key is not null
       limit 1`,
      [videoId],
    );
    const video = result.rows[0];
    if (!video) {
      throw new HttpError(409, "review_media_not_ready", "İşlenmiş video henüz önizlemeye hazır değil.");
    }
    const authorization = createMediaToken({
      videoId: video.id,
      groupId: video.group_id,
      purpose: "review",
      codeVersion: Number(video.access_code_rotation_count || 0),
    }, config.mediaSecret, Math.min(config.mediaTtlSeconds, 300));
    return {
      videoId: video.id,
      expiresAt: new Date(Date.now() + Math.min(config.mediaTtlSeconds, 300) * 1000).toISOString(),
      streamUrl: `${config.publicBaseUrl}/v1/media/${video.id}?authorization=${encodeURIComponent(authorization)}&disposition=review`,
    };
  });
}

export async function reviewVideo(videoIdValue, input, materialsConfig) {
  const videoId = numericId(videoIdValue, "video");
  const actorId = numericId(input?.actorId, "actor");
  const decision = String(input?.decision || "");
  const checklist = {
    recipientMatch: input?.checklist?.recipientMatch === true,
    audioVideoOk: input?.checklist?.audioVideoOk === true,
    closingCardOk: input?.checklist?.closingCardOk === true,
  };
  const reason = String(input?.reason || "").trim().slice(0, 1000);
  if (!['approve', 'reject'].includes(decision)) {
    throw new HttpError(400, "invalid_review_decision", "Teknik kontrol kararı geçersiz.");
  }
  if (decision === "approve" && !Object.values(checklist).every(Boolean)) {
    throw new HttpError(400, "review_checklist_incomplete", "Onaydan önce kontrol listesini tamamlayın.");
  }
  if (decision === "reject" && !reason) {
    throw new HttpError(400, "review_reason_required", "Red nedeni zorunludur.");
  }

  const result = await transaction(async (client) => {
    const selected = await client.query(
      `select v.*, g.id as locked_group_id
       from operation_videos v
       join operation_groups g on g.id = v.group_id
       where v.id = $1
       for update of v, g`,
      [videoId],
    );
    const video = selected.rows[0];
    if (!video) throw new HttpError(404, "video_not_found", "Video bulunamadı.");
    if (video.status !== "review_pending") {
      throw new HttpError(409, "video_not_review_pending", "Yalnız teknik kontrol bekleyen video değerlendirilebilir.");
    }
    const reviewPayload = JSON.stringify({
      ...checklist,
      decision,
      reason: reason || null,
      reviewedAt: new Date().toISOString(),
    });
    if (decision === "reject") {
      await client.query(
        `update operation_videos
         set status = 'rejected', content_review_status = 'rejected', review_checklist = $2::jsonb,
             reviewed_at = now(), reviewed_by_id = $3, is_active = false, updated_at = now()
         where id = $1`,
        [video.id, reviewPayload, actorId],
      );
      await client.query(
        `update operation_groups
         set status = 'video_pending', active_video_id = null, test_message_invalidated_at = now(), updated_at = now()
         where id = $1 and active_video_id = $2`,
        [video.group_id, video.id],
      );
      return { decision, groupId: video.group_id, videoId: video.id };
    }
    if (!video.processed_storage_key || !video.processed_sha256) {
      throw new HttpError(409, "processed_video_missing", "İşlenmiş video dosyası eksik.");
    }
    await client.query(
      `update operation_videos
       set status = 'superseded', is_active = false, updated_at = now()
       where group_id = $1 and id <> $2 and is_active = true`,
      [video.group_id, video.id],
    );
    await client.query(
      `update operation_videos
       set status = 'ready', content_review_status = 'approved', review_checklist = $2::jsonb,
           reviewed_at = now(), reviewed_by_id = $3, is_active = true,
           ready_at = coalesce(ready_at, now()), updated_at = now()
       where id = $1`,
      [video.id, reviewPayload, actorId],
    );
    await client.query(
      `update delivery_messages
       set status = 'cancelled', updated_at = now()
       where group_id = $1 and video_id <> $2
         and is_test = false and status in ('draft', 'countdown', 'queued', 'paused', 'failed')`,
      [video.group_id, video.id],
    );
    await client.query(
      `update operation_groups
       set active_video_id = $2, status = 'video_ready', dispatch_state = 'idle',
           dispatch_locked_at = null, dispatch_locked_by = null,
           test_message_invalidated_at = now(), updated_at = now()
       where id = $1`,
      [video.group_id, video.id],
    );
    return { decision, groupId: video.group_id, videoId: video.id };
  });

  if (decision === "approve") {
    await initializeAccessMaterials(result.groupId, materialsConfig);
    const drafts = await prepareDeliveryDrafts(result.groupId);
    return { ...result, drafts };
  }
  return result;
}

export async function prepareDeliveryDrafts(groupIdValue) {
  const groupId = numericId(groupIdValue, "group");
  return transaction(async (client) => {
    const selected = await client.query(
      `select g.id, g.code, g.message_template, g.active_video_id,
              coalesce((select cl.title from campaigns_locales cl where cl._parent_id = g.campaign_id
                        order by (cl._locale = 'tr') desc, cl.id limit 1), 'Mizan bağış videosu') as campaign_name,
              v.version
       from operation_groups g
       join operation_videos v on v.id = g.active_video_id
       where g.id = $1 and v.status = 'ready' and v.content_review_status = 'approved'
       for update of g, v`,
      [groupId],
    );
    const group = selected.rows[0];
    if (!group) throw new HttpError(409, "approved_video_required", "Taslak için onaylanmış aktif video gereklidir.");
    const recipients = await client.query(
      `select
         regexp_replace(coalesce(nullif(p.effective_phone, ''), nullif(p.phone, ''), i.phone), '[^0-9]', '', 'g') as phone,
         array_agg(distinct coalesce(nullif(p.name, ''), i.donor_name) order by coalesce(nullif(p.name, ''), i.donor_name)) as names,
         min(m.id) as member_id,
         min(m.donation_id) as donation_id,
         min(m.participant_id) as participant_id
       from operation_group_members m
       join donation_intents i on i.id = m.donation_intent_id
       left join donation_participants p on p.id = m.participant_id
       where m.group_id = $1 and m.status = 'confirmed'
         and (p.id is null or p.is_payer = true or p.contact_consent = true)
       group by regexp_replace(coalesce(nullif(p.effective_phone, ''), nullif(p.phone, ''), i.phone), '[^0-9]', '', 'g')`,
      [groupId],
    );
    let created = 0;
    let skipped = 0;
    for (const recipient of recipients.rows) {
      const phone = normalizePhone(recipient.phone);
      if (!phone) {
        skipped += 1;
        continue;
      }
      const names = (recipient.names || []).map((name) => String(name).trim()).filter(Boolean).slice(0, 30);
      if (names.length === 0) {
        skipped += 1;
        continue;
      }
      const phoneHash = sha256(phone);
      const idempotencyKey = sha256(`${group.id}:${group.active_video_id}:${phoneHash}:normal`);
      const body = editableMessageBody(group.message_template, {
        names,
        campaignName: group.campaign_name,
        groupCode: group.code,
      });
      const inserted = await client.query(
        `insert into delivery_messages (
           group_id, video_id, donation_id, participant_id, member_id,
           recipient_phone, normalized_phone, recipient_phone_hash,
           body, body_snapshot, message_snapshot, system_payload_snapshot,
           idempotency_key, status, attempt_count, access_token_digest, expires_at,
           is_test, message_type, recipient_role, retry_class, updated_at, created_at
         ) values (
           $1, $2, $3, $4, $5, $6, $6, $7, $8, $8, $9::jsonb, $10::jsonb,
           $11, 'draft', 0, $12, now() + interval '3 months', false, 'normal',
           case when $4::int is null then 'payer'::public.enum_delivery_messages_recipient_role
                else 'participant'::public.enum_delivery_messages_recipient_role end,
           'none', now(), now()
         ) on conflict (idempotency_key) do nothing returning id`,
        [
          group.id,
          group.active_video_id,
          recipient.donation_id,
          recipient.participant_id,
          recipient.member_id,
          phone,
          phoneHash,
          body,
          JSON.stringify({ schemaVersion: 1, recipientNames: names, campaignName: group.campaign_name }),
          JSON.stringify({ schemaVersion: 1, groupId: group.id, videoId: group.active_video_id, messageType: "normal" }),
          idempotencyKey,
          sha256(randomBytes(32).toString("hex")),
        ],
      );
      created += inserted.rowCount || 0;
    }
    return { created, skipped, recipients: recipients.rowCount, videoId: group.active_video_id };
  });
}

export async function dispatchGroup(groupIdValue, action) {
  const groupId = numericId(groupIdValue, "group");
  if (action === "prepare") return prepareDeliveryDrafts(groupId);
  return transaction(async (client) => {
    const selected = await client.query(
      `select * from operation_groups where id = $1 for update`,
      [groupId],
    );
    const group = selected.rows[0];
    if (!group) throw new HttpError(404, "group_not_found", "Operasyon grubu bulunamadı.");
    if (action === "queue" || action === "resume") {
      const current = await computeGroupMessageFingerprint(client, groupId);
      const testPassed = String(group.test_message_video_id) === String(current.activeVideoId)
        && group.test_message_fingerprint === current.fingerprint
        && group.test_message_passed_at
        && !group.test_message_invalidated_at;
      if (!testPassed) throw new HttpError(409, "test_message_required", "Gerçek gönderimden önce güncel taslakla güvenli test mesajı gönderin.");
      const batchId = randomUUID();
      const queued = await client.query(
        `with candidates as (
           select id, row_number() over (order by id) - 1 as offset_index
           from delivery_messages
           where group_id = $1 and is_test = false
             and status in ('draft', 'paused', 'failed')
         )
         update delivery_messages m
         set status = 'queued', dispatch_batch_id = $2,
             scheduled_at = now() + interval '5 seconds' + (c.offset_index * interval '5 seconds'),
             locked_at = null, locked_by = null, last_error = null, last_error_code = null,
             retry_class = 'none', updated_at = now()
         from candidates c where m.id = c.id returning m.id`,
        [groupId, batchId],
      );
      if (!queued.rowCount) throw new HttpError(409, "no_dispatch_drafts", "Gönderilecek taslak bulunamadı.");
      await client.query(
        `update operation_groups set dispatch_state = 'countdown', dispatch_pause_reason = null,
             dispatch_locked_at = null, dispatch_locked_by = null, updated_at = now() where id = $1`,
        [groupId],
      );
      return { action, batchId, count: queued.rowCount };
    }
    if (action === "pause") {
      const paused = await client.query(
        `update delivery_messages set status = 'paused', locked_at = null, locked_by = null, updated_at = now()
         where group_id = $1 and is_test = false and status in ('countdown', 'queued') returning id`,
        [groupId],
      );
      await client.query(
        `update operation_groups set dispatch_state = 'paused', dispatch_locked_at = null,
             dispatch_locked_by = null, updated_at = now() where id = $1`,
        [groupId],
      );
      return { action, count: paused.rowCount };
    }
    if (action === "cancel") {
      const cancelled = await client.query(
        `update delivery_messages set status = 'cancelled', locked_at = null, locked_by = null, updated_at = now()
         where group_id = $1 and is_test = false and status in ('draft', 'countdown', 'queued', 'paused', 'failed') returning id`,
        [groupId],
      );
      await client.query(
        `update operation_groups set dispatch_state = 'cancelled', dispatch_locked_at = null,
             dispatch_locked_by = null, updated_at = now() where id = $1`,
        [groupId],
      );
      return { action, count: cancelled.rowCount };
    }
    throw new HttpError(400, "invalid_dispatch_action", "Gönderim işlemi geçersiz.");
  });
}

export async function retryStaleVideo(videoIdValue) {
  const videoId = numericId(videoIdValue, "video");
  return transaction(async (client) => {
    const lock = await client.query("select pg_try_advisory_xact_lock(hashtext($1)) as acquired", [ffmpegLockName]);
    if (!lock.rows[0]?.acquired) {
      throw new HttpError(409, "video_worker_busy", "Video worker şu anda çalışıyor; işlem zorla kesilmedi.");
    }
    const updated = await client.query(
      `update operation_videos
       set status = 'uploaded', processing_started_at = null, retry_after = null,
           last_error = null, last_error_code = null, updated_at = now()
       where id = $1 and (
         status in ('processing_failed', 'quarantined')
         or (status = 'processing' and processing_started_at < now() - interval '15 minutes')
       ) returning id, status`,
      [videoId],
    );
    if (!updated.rowCount) {
      throw new HttpError(409, "video_not_retryable", "Video henüz yeniden işlenebilir durumda değil.");
    }
    return updated.rows[0];
  });
}
