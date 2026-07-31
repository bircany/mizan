import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withDatabaseTransaction } from "@/lib/database";
import {
  createDeliveryUploadGrant,
  type DeliveryUploadMime,
  type DeliveryUploadRole,
} from "@/lib/delivery/upload-auth";

type GroupRow = QueryResultRow & {
  groupId: string;
  code: string;
  status: string;
  dispatchState: string;
  capacity: number | null;
  confirmedCount: number;
  operationType: string | null;
  assignedOperatorId: string | null;
  slaughteredAt: Date | string | null;
  slaughterScript: string | null;
  codeFailures: number;
  codeLockedUntil: Date | string | null;
};

type PreviousVideoRow = QueryResultRow & {
  id: string;
  version: number;
  deliveryStarted: boolean;
};

export type DeliveryUploadReservation =
  | {
      ok: true;
      videoId: string;
      uploadId: string;
      version: number;
      grant: string;
      expiresAt: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      retryAfterSeconds?: number;
    };

type ReserveDeliveryUploadInput = {
  groupId: number;
  repeatedGroupCode: string;
  fileName: string;
  mimeType: DeliveryUploadMime;
  sizeBytes: number;
  maxBytes: number;
  user: {
    id: string;
    email?: string | null;
    role: DeliveryUploadRole;
  };
  ipAddress?: string | null;
};

function exactTextEqual(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function secondsUntil(value: Date | string) {
  return Math.max(1, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
}

async function appendAudit(
  client: PoolClient,
  input: {
    action: string;
    actorEmail?: string | null;
    groupId: string;
    details: Record<string, unknown>;
    ipAddress?: string | null;
  },
) {
  await client.query(
    `insert into public.audit_logs (
       action, actor_email, target_collection, target_id, details, ip_address
     ) values ($1, $2, 'operation-groups', $3, $4::jsonb, $5)`,
    [
      input.action,
      input.actorEmail || null,
      input.groupId,
      JSON.stringify(input.details),
      input.ipAddress || null,
    ],
  );
}

type UploadGateGroup = Pick<
  GroupRow,
  | "operationType"
  | "dispatchState"
  | "capacity"
  | "confirmedCount"
  | "status"
>;

export function validateGroupGate(group: UploadGateGroup) {
  if (!["standard_video", "slaughter_video"].includes(String(group.operationType))) {
    return "Bu kampanya için açıkça tanımlanmış bir video operasyon tipi yok.";
  }
  if (["countdown", "queued", "sending"].includes(group.dispatchState)) {
    return "Mesaj gönderimi sürerken video değiştirilemez. Önce gönderimi duraklatın.";
  }
  if (group.operationType === "slaughter_video") {
    if (!group.capacity || group.confirmedCount < group.capacity) {
      return "Sabit hisseli grup tamamen dolmadan video yüklenemez.";
    }
    return null;
  }
  if (
    ![
      "video_pending",
      "video_ready",
      "delivery_started",
      "completed",
    ].includes(group.status)
  ) {
    return "Standart video operasyonu videoya hazırlandıktan sonra yükleme açılır.";
  }
  return null;
}

export function uploadGrantLifetimeSeconds(
  expiresAt: Date | string,
  nowMs = Date.now(),
) {
  return Math.max(
    30,
    Math.min(
      10 * 60,
      Math.floor((new Date(expiresAt).getTime() - nowMs) / 1000),
    ),
  );
}

export async function reserveDeliveryUploadSession(
  input: ReserveDeliveryUploadInput,
): Promise<DeliveryUploadReservation> {
  return withDatabaseTransaction(async (client) => {
    const groupResult = await client.query<GroupRow>(
      `select
         g.id::text as "groupId",
         g.code,
         g.status::text as status,
         g.dispatch_state::text as "dispatchState",
         g.capacity,
         g.confirmed_count as "confirmedCount",
         coalesce(g.operation_type::text, c.operation_type::text) as "operationType",
         g.assigned_operator_id::text as "assignedOperatorId",
         g.slaughtered_at as "slaughteredAt",
         c.slaughter_script as "slaughterScript",
         coalesce(g.group_code_confirmation_failures, 0) as "codeFailures",
         g.group_code_locked_until as "codeLockedUntil"
       from public.operation_groups g
       join public.campaigns c on c.id = g.campaign_id
       where g.id = $1
       for update of g`,
      [input.groupId],
    );
    const group = groupResult.rows[0];
    if (!group) return { ok: false, status: 404, error: "Operasyon grubu bulunamadı." };

    if (
      input.user.role === "field_operator" &&
      group.assignedOperatorId !== input.user.id
    ) {
      return {
        ok: false,
        status: 403,
        error: "Yalnızca size atanmış operasyon grubuna video yükleyebilirsiniz.",
      };
    }

    const gateError = validateGroupGate(group);
    if (gateError) return { ok: false, status: 409, error: gateError };

    const lockedUntil = group.codeLockedUntil
      ? new Date(group.codeLockedUntil)
      : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      return {
        ok: false,
        status: 423,
        error: "Grup kodu denemeleri geçici olarak kilitlendi.",
        retryAfterSeconds: secondsUntil(lockedUntil),
      };
    }

    if (!exactTextEqual(input.repeatedGroupCode, group.code)) {
      const previousFailures = lockedUntil ? 0 : Number(group.codeFailures || 0);
      const failures = previousFailures + 1;
      const nextLock = failures >= 3
        ? new Date(Date.now() + 5 * 60_000)
        : null;
      await client.query(
        `update public.operation_groups
         set group_code_confirmation_failures = $2,
             group_code_locked_until = $3,
             updated_at = now()
         where id = $1`,
        [input.groupId, failures, nextLock],
      );
      await appendAudit(client, {
        action: "delivery.upload.group_code_rejected",
        actorEmail: input.user.email,
        groupId: group.groupId,
        ipAddress: input.ipAddress,
        details: {
          actorId: input.user.id,
          failures,
          lockedUntil: nextLock?.toISOString() || null,
        },
      });
      return {
        ok: false,
        status: nextLock ? 423 : 400,
        error: nextLock
          ? "Grup kodu üç kez yanlış girildi. Beş dakika sonra yeniden deneyin."
          : `Grup kodu eşleşmiyor. ${3 - failures} deneme hakkınız kaldı.`,
        retryAfterSeconds: nextLock ? 5 * 60 : undefined,
      };
    }

    await client.query(
      `update public.operation_groups
       set group_code_confirmation_failures = 0,
           group_code_locked_until = null,
           updated_at = now()
       where id = $1`,
      [input.groupId],
    );

    // This transaction-scoped lock makes the two-slot check and insert atomic
    // across both the web instances and the VDS tus pre-create hook.
    await client.query(
      "select pg_advisory_xact_lock(hashtext('mizan:video-upload-slots'))",
    );
    const active = await client.query<{ count: number }>(
      `select count(*)::int as count
       from public.operation_videos
       where status = 'uploading'
         and (
           (upload_token_consumed_at is null and upload_token_expires_at > now())
           or upload_token_consumed_at > now() - interval '24 hours'
         )`,
    );
    if (Number(active.rows[0]?.count || 0) >= 2) {
      return {
        ok: false,
        status: 429,
        error: "İki aktif yükleme var. Bir yükleme tamamlandıktan sonra yeniden deneyin.",
        retryAfterSeconds: 30,
      };
    }

    const previous = await client.query<PreviousVideoRow>(
      `select
         v.id::text as id,
         v.version,
         exists (
           select 1
           from public.delivery_messages m
           where m.group_id = $1
             and m.status in ('sent', 'delivered', 'read', 'manual_sent')
         ) as "deliveryStarted"
       from public.operation_videos v
       where v.group_id = $1
       order by v.version desc, v.id desc
       limit 1`,
      [input.groupId],
    );
    const previousVideo = previous.rows[0];
    const version = Number(previousVideo?.version || 0) + 1;
    const uploadId = randomUUID();
    const jti = randomUUID();
    const nonce = randomBytes(24).toString("base64url");
    const nonceHash = createHash("sha256").update(nonce).digest("hex");
    // `created_at` uses the PostgreSQL transaction timestamp but is stored at
    // millisecond precision. Keep a one-second margin so sub-millisecond
    // rounding can never exceed the strict ten-minute database constraint.
    const tokenWindow = await client.query<{ expiresAt: Date }>(
      `select now() + interval '9 minutes 59 seconds' as "expiresAt"`,
    );
    const expiresAt = new Date(tokenWindow.rows[0]?.expiresAt);
    if (!Number.isFinite(expiresAt.getTime())) {
      throw new Error("Video upload token süresi oluşturulamadı.");
    }

    const inserted = await client.query<{ id: string }>(
      `insert into public.operation_videos (
         group_id,
         uploaded_by_id,
         upload_id,
         raw_storage_key,
         original_filename,
         mime_type,
         size_bytes,
         status,
         version,
         replaces_video_id,
         attempt_count,
         raw_delete_after,
         processed_delete_after,
         upload_token_jti,
         upload_nonce_hash,
         upload_token_expires_at,
         upload_max_bytes,
         version_kind
       ) values (
         $1, $2, $3, $4, $5, $6, $7, 'uploading', $8, $9, 0,
         now() + interval '24 hours',
         now() + interval '90 days',
         $10, $11, $12, $13, $14
       )
       returning id::text as id`,
      [
        input.groupId,
        input.user.id,
        uploadId,
        `${uploadId}.source`,
        input.fileName,
        input.mimeType,
        input.sizeBytes,
        version,
        previousVideo?.id || null,
        jti,
        nonceHash,
        expiresAt,
        input.maxBytes,
        !previousVideo
          ? "initial"
          : previousVideo.deliveryStarted
            ? "correction"
            : "replacement",
      ],
    );
    const videoId = inserted.rows[0]?.id;
    if (!videoId) throw new Error("Video upload kaydı oluşturulamadı.");
    const slaughterAutoMarked =
      group.operationType === "slaughter_video" && !group.slaughteredAt;
    await client.query(
      `update public.operation_groups
       set status = 'video_pending',
           slaughtered_at = case
             when $2::boolean then coalesce(slaughtered_at, now())
             else slaughtered_at
           end,
           slaughtered_by_id = case
             when $2::boolean then coalesce(slaughtered_by_id, $3::integer)
             else slaughtered_by_id
           end,
           slaughter_script_snapshot = case
             when $2::boolean then coalesce(slaughter_script_snapshot, $4)
             else slaughter_script_snapshot
           end,
           test_message_invalidated_at = now(),
           updated_at = now()
       where id = $1`,
      [
        input.groupId,
        slaughterAutoMarked,
        input.user.id,
        group.slaughterScript || "",
      ],
    );
    if (slaughterAutoMarked) {
      await appendAudit(client, {
        action: "delivery.operation.slaughter_auto_marked_by_upload",
        actorEmail: input.user.email,
        groupId: group.groupId,
        ipAddress: input.ipAddress,
        details: {
          actorId: input.user.id,
          videoId,
          previousStatus: group.status,
          nextStatus: "video_pending",
          reason: "verified_video_upload_session",
        },
      });
    }

    const grant = createDeliveryUploadGrant(
      {
        userId: input.user.id,
        role: input.user.role,
        groupId: group.groupId,
        videoId,
        jti,
        nonce,
        maxBytes: input.maxBytes,
        allowedMime: [input.mimeType],
      },
      uploadGrantLifetimeSeconds(expiresAt),
    );
    await appendAudit(client, {
      action: "delivery.upload.session_created",
      actorEmail: input.user.email,
      groupId: group.groupId,
      ipAddress: input.ipAddress,
      details: {
        actorId: input.user.id,
        videoId,
        uploadId,
        version,
        operationType: group.operationType,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadTokenJti: jti,
        uploadTokenExpiresAt: expiresAt.toISOString(),
      },
    });
    return {
      ok: true,
      videoId,
      uploadId,
      version,
      grant,
      expiresAt: expiresAt.toISOString(),
    };
  });
}
