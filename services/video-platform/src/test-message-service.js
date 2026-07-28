import { query, transaction } from "./db.js";
import { HttpError } from "./errors.js";
import { computeGroupMessageFingerprint } from "./message-fingerprint.js";
import { sha256 } from "./security/hashes.js";

export function listSafeTestRecipients(recipients) {
  return [...recipients.values()].map(({ key, label }) => ({ key, label }));
}

export async function enqueueSafeTestMessage(input, recipients) {
  const sourceMessageId = String(input?.sourceMessageId || "");
  const recipientKey = String(input?.recipientKey || "");
  const idempotencyKey = String(input?.idempotencyKey || "");
  const actorId = String(input?.actorId || "");
  if (!/^\d+$/.test(sourceMessageId)) {
    throw new HttpError(400, "invalid_source_message", "Test için kaynak mesaj seçilmelidir.");
  }
  if (!recipients.has(recipientKey)) {
    throw new HttpError(400, "invalid_test_recipient", "Yalnız önceden tanımlanmış güvenli test alıcıları kullanılabilir.");
  }
  if (!/^[A-Za-z0-9:_-]{16,160}$/.test(idempotencyKey)) {
    throw new HttpError(400, "invalid_idempotency_key", "Test mesajı idempotency anahtarı geçersiz.");
  }
  if (!/^\d+$/.test(actorId)) throw new HttpError(400, "invalid_actor", "Testi başlatan kullanıcı geçersiz.");

  return transaction(async (client) => {
    const selected = await client.query(
      `select
         m.*,
         v.version,
         v.content_review_status,
         v.reviewed_at,
         g.code,
         g.expires_at,
         g.access_code_rotation_count
       from delivery_messages m
       join operation_videos v on v.id = m.video_id
       join operation_groups g on g.id = m.group_id
       where m.id::text = $1
         and m.status = 'draft'
         and m.is_test = false
         and v.is_active = true
         and v.status = 'ready'
       for update of m`,
      [sourceMessageId],
    );
    const source = selected.rows[0];
    if (!source) throw new HttpError(409, "test_source_not_ready", "Mesaj taslağı veya video test için hazır değil.");
    if (source.content_review_status !== "approved" || !source.reviewed_at) {
      throw new HttpError(409, "video_review_required", "Test mesajından önce video kontrol listesi onaylanmalıdır.");
    }

    const { fingerprint } = await computeGroupMessageFingerprint(client, source.group_id);
    const systemPayload = {
      ...(source.system_payload_snapshot || {}),
      schemaVersion: 1,
      groupId: source.group_id,
      videoId: source.video_id,
      messageType: "test",
      testRecipientKey: recipientKey,
      testRequestedById: Number(actorId),
    };
    const inserted = await client.query(
      `insert into delivery_messages (
         group_id,
         video_id,
         recipient_phone,
         recipient_phone_hash,
         body,
         body_snapshot,
         message_snapshot,
         system_payload_snapshot,
         idempotency_key,
         status,
         scheduled_at,
         attempt_count,
         access_token_digest,
         expires_at,
         is_test,
         message_type,
         test_number_key,
         test_fingerprint,
         retry_class,
         updated_at,
         created_at
       ) values (
         $1, $2, null, $3, null, $4, $5, $6, $7, 'queued', now(), 0, $8, $9,
         true, 'test', $10, $11, 'none', now(), now()
       )
       on conflict (idempotency_key) do update
         set updated_at = delivery_messages.updated_at
       returning id, status, test_fingerprint`,
      [
        source.group_id,
        source.video_id,
        sha256(`test-recipient:${recipientKey}`),
        source.body_snapshot,
        source.message_snapshot,
        JSON.stringify(systemPayload),
        idempotencyKey,
        sha256(`test-access:${idempotencyKey}`),
        source.expires_at,
        recipientKey,
        fingerprint,
      ],
    );
    return inserted.rows[0];
  });
}

export async function apiDatabaseReadiness() {
  const result = await query(
    `select
       to_regclass('public.operation_groups') is not null
       and to_regclass('public.operation_videos') is not null
       and to_regclass('public.delivery_messages') is not null as ready`,
  );
  return Boolean(result.rows[0]?.ready);
}
