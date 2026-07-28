import "server-only";

import { timingSafeEqual } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withDatabaseTransaction } from "@/lib/database";

export type OperationActor = {
  id: string;
  email?: string | null;
  role: "admin" | "field_operator";
};

export type ScheduleSlaughterOperation = {
  action: "schedule_slaughter";
  scheduledAt: string;
  order: number;
  place: string;
  assignedOperatorId: number;
  note?: string | null;
};

export type MarkSlaughteredOperation = {
  action: "mark_slaughtered";
  groupCode: string;
};

export type RevertSlaughterOperation = {
  action: "revert_slaughter";
  reason: string;
};

export type CapacityOverrideOperation = {
  action: "capacity_override";
  newCapacity: number;
  reason: string;
  associationCovers: boolean;
};

export type GroupOperation =
  | ScheduleSlaughterOperation
  | MarkSlaughteredOperation
  | RevertSlaughterOperation
  | CapacityOverrideOperation;

export type CampaignOperation =
  | { action: "pause"; reason: string }
  | { action: "resume"; reason: string }
  | { action: "close"; reason: string; acknowledge: boolean }
  | { action: "prepare_standard_video"; reason: string };

export type OperationFailure = {
  ok: false;
  status: number;
  code: string;
  error: string;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
};

export type OperationSuccess<T extends Record<string, unknown>> = {
  ok: true;
  status: 200;
  data: T;
};

export type OperationResult<T extends Record<string, unknown>> =
  | OperationFailure
  | OperationSuccess<T>;

type CampaignRow = QueryResultRow & {
  id: string;
  status: string;
  isDonationOpen: boolean;
  pricingModel: string;
  videoDelivery: string;
  operationType: string | null;
  unitPrice: string | null;
  currency: string | null;
  groupCapacity: number | null;
  messageTemplate: string | null;
  slaughterScript: string | null;
  slaughterScriptVersion: number | null;
};

type GroupRow = QueryResultRow & {
  id: string;
  campaignId: string;
  code: string;
  ordinal: number;
  capacity: number | null;
  reservedCount: number;
  confirmedCount: number;
  status: string;
  operationType: string | null;
  capacityOverrideOriginal: number | null;
  slaughterScheduledAt: Date | string | null;
  slaughterOrder: number | null;
  slaughterPlace: string | null;
  assignedOperatorId: string | null;
  fieldNotes: string | null;
  slaughteredAt: Date | string | null;
  slaughteredById: string | null;
  slaughterScriptSnapshot: string | null;
  groupCodeFailures: number;
  groupCodeLockedUntil: Date | string | null;
  dispatchState: string;
  activeVideoId: string | null;
  databaseNow: Date | string;
};

type LockedGroupContext = {
  campaign: CampaignRow;
  group: GroupRow;
};

type CampaignCloseSummary = {
  incompleteGroups: Array<{
    id: string;
    code: string;
    ordinal: number;
    capacity: number;
    confirmedCount: number;
    reservedCount: number;
    status: string;
  }>;
  liveReservations: {
    intentCount: number;
    reservedUnits: number;
    earliestExpiry: string | null;
  };
};

type PolicyDecision =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code: string;
      error: string;
    };

const MARKABLE_STATUSES = new Set([
  "full",
  "ready_for_slaughter",
  "scheduled",
  // The original confirmation RPC used this value as soon as a group filled.
  // A missing slaughtered_at distinguishes that legacy pre-slaughter state.
  "video_pending",
]);

const SCHEDULABLE_STATUSES = new Set([
  "open",
  "collecting",
  "full",
  "ready_for_slaughter",
  "scheduled",
  // See MARKABLE_STATUSES. An actually slaughtered group is rejected below.
  "video_pending",
]);

const CAPACITY_OVERRIDE_STATUSES = new Set(["open", "collecting"]);
const ACTIVE_RESERVATION_STATUSES = [
  "reserved",
  "payment_initialized",
  "awaiting_bank_transfer",
  "bank_transfer_submitted",
  "callback_received",
] as const;

function failure(
  status: number,
  code: string,
  error: string,
  details?: Record<string, unknown>,
  retryAfterSeconds?: number,
): OperationFailure {
  return {
    ok: false,
    status,
    code,
    error,
    ...(details ? { details } : {}),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
}

function success<T extends Record<string, unknown>>(
  data: T,
): OperationSuccess<T> {
  return { ok: true, status: 200, data };
}

function policyFailure(
  status: number,
  code: string,
  error: string,
): PolicyDecision {
  return { ok: false, status, code, error };
}

function fromPolicy(decision: Exclude<PolicyDecision, { ok: true }>) {
  return failure(decision.status, decision.code, decision.error);
}

function actorDatabaseId(actor: OperationActor) {
  const id = Number(actor.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function nonBlank(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function exactTextEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function secondsBetween(later: Date | string, earlier: Date | string) {
  return Math.max(
    1,
    Math.ceil(
      (new Date(later).getTime() - new Date(earlier).getTime()) / 1_000,
    ),
  );
}

export function evaluateAssignedOperatorPolicy(input: {
  actor: OperationActor;
  assignedOperatorId: string | null;
}): PolicyDecision {
  if (input.actor.role === "admin") return { ok: true };
  if (
    input.actor.role === "field_operator" &&
    input.assignedOperatorId === input.actor.id
  ) {
    return { ok: true };
  }
  return policyFailure(
    403,
    "GROUP_NOT_ASSIGNED",
    "Yalnızca size atanmış operasyon grubunda işlem yapabilirsiniz.",
  );
}

export function evaluateSlaughterReadiness(input: {
  operationType: string | null;
  status: string;
  capacity: number | null;
  confirmedCount: number;
  reservedCount: number;
  slaughteredAt?: Date | string | null;
  slaughterScript?: string | null;
  slaughterScriptVersion?: number | null;
}): PolicyDecision {
  if (input.operationType !== "slaughter_video") {
    return policyFailure(
      409,
      "NOT_A_SLAUGHTER_OPERATION",
      "Bu grup kesim videosu operasyonuna ait değil.",
    );
  }
  if (
    !Number.isInteger(input.capacity) ||
    Number(input.capacity) <= 0 ||
    input.confirmedCount !== input.capacity ||
    input.reservedCount !== 0
  ) {
    return policyFailure(
      409,
      "GROUP_NOT_FULLY_CONFIRMED",
      "Kesim kaydı için grup kapasitesinin tamamı onaylanmış ve rezerv sayısı sıfır olmalıdır.",
    );
  }
  if (input.slaughteredAt) {
    return policyFailure(
      409,
      "SLAUGHTER_ALREADY_MARKED",
      "Bu grup daha önce kesildi olarak işaretlenmiş.",
    );
  }
  if (!MARKABLE_STATUSES.has(input.status)) {
    return policyFailure(
      409,
      "INVALID_SLAUGHTER_STATUS",
      "Grubun mevcut durumu kesim kaydına uygun değil.",
    );
  }
  if (
    !nonBlank(input.slaughterScript) ||
    !Number.isInteger(input.slaughterScriptVersion) ||
    Number(input.slaughterScriptVersion) <= 0
  ) {
    return policyFailure(
      409,
      "SLAUGHTER_SCRIPT_REQUIRED",
      "Kampanyada sürümlü bir kesim metni tanımlanmadan kesim kaydedilemez.",
    );
  }
  return { ok: true };
}

export function evaluateCapacityOverridePolicy(input: {
  actorRole: OperationActor["role"];
  isLastIncompleteGroup: boolean;
  status: string;
  oldCapacity: number | null;
  originalCapacity: number | null;
  confirmedCount: number;
  reservedCount: number;
  activeReservationCount: number;
  newCapacity: number;
  reason: string;
  associationCovers: boolean;
}): PolicyDecision {
  if (input.actorRole !== "admin") {
    return policyFailure(
      403,
      "ADMIN_REQUIRED",
      "Kapasite istisnası yalnızca yönetici tarafından uygulanabilir.",
    );
  }
  if (!nonBlank(input.reason)) {
    return policyFailure(
      400,
      "REASON_REQUIRED",
      "Kapasite istisnası için gerekçe zorunludur.",
    );
  }
  if (input.associationCovers !== true) {
    return policyFailure(
      409,
      "ASSOCIATION_COVERAGE_REQUIRED",
      "Eksik hissenin dernek tarafından karşılanacağı açıkça onaylanmalıdır.",
    );
  }
  if (!input.isLastIncompleteGroup) {
    return policyFailure(
      409,
      "NOT_LAST_INCOMPLETE_GROUP",
      "Kapasite yalnızca kampanyanın son eksik grubunda değiştirilebilir.",
    );
  }
  if (!CAPACITY_OVERRIDE_STATUSES.has(input.status)) {
    return policyFailure(
      409,
      "GROUP_STATUS_LOCKED",
      "Kesime hazır, planlanmış veya ilerlemiş grupların kapasitesi değiştirilemez.",
    );
  }
  if (
    !Number.isInteger(input.oldCapacity) ||
    Number(input.oldCapacity) <= 0 ||
    !Number.isInteger(input.newCapacity) ||
    input.newCapacity <= 0
  ) {
    return policyFailure(
      400,
      "INVALID_CAPACITY",
      "Geçerli bir grup kapasitesi girilmelidir.",
    );
  }
  if (input.newCapacity < input.confirmedCount) {
    return policyFailure(
      409,
      "CAPACITY_BELOW_CONFIRMED",
      "Yeni kapasite onaylanmış hisse sayısından düşük olamaz.",
    );
  }
  const upperBound = input.originalCapacity ?? Number(input.oldCapacity);
  if (input.newCapacity > upperBound) {
    return policyFailure(
      409,
      "CAPACITY_ABOVE_ORIGINAL",
      "Yeni kapasite grubun ilk kapasitesini aşamaz.",
    );
  }
  if (input.newCapacity === input.oldCapacity) {
    return policyFailure(
      409,
      "CAPACITY_UNCHANGED",
      "Yeni kapasite mevcut kapasiteden farklı olmalıdır.",
    );
  }
  if (input.reservedCount !== 0 || input.activeReservationCount !== 0) {
    return policyFailure(
      409,
      "ACTIVE_RESERVATIONS_EXIST",
      "Aktif veya bekleyen rezervasyon varken kapasite değiştirilemez.",
    );
  }
  return { ok: true };
}

export function evaluateCampaignActionPolicy(input: {
  actorRole: OperationActor["role"];
  action: CampaignOperation["action"];
  reason: string;
  status: string;
  pricingModel: string;
  videoDelivery: string;
  operationType: string | null;
  messageTemplate?: string | null;
}): PolicyDecision {
  if (input.actorRole !== "admin") {
    return policyFailure(
      403,
      "ADMIN_REQUIRED",
      "Kampanya operasyonları yalnızca yönetici tarafından uygulanabilir.",
    );
  }
  if (!nonBlank(input.reason)) {
    return policyFailure(
      400,
      "REASON_REQUIRED",
      "Bu işlem için gerekçe zorunludur.",
    );
  }
  if (input.videoDelivery === "video" && !input.operationType) {
    return policyFailure(
      409,
      "CAMPAIGN_OPERATION_TYPE_REQUIRED",
      "Videolu kampanyada operasyon tipi tanımlanmalıdır.",
    );
  }
  if (input.action === "pause" && input.status !== "active") {
    return policyFailure(
      409,
      "CAMPAIGN_NOT_ACTIVE",
      "Yalnızca aktif kampanya duraklatılabilir.",
    );
  }
  if (input.action === "resume" && input.status !== "paused") {
    return policyFailure(
      409,
      "CAMPAIGN_NOT_PAUSED",
      "Yalnızca duraklatılmış kampanya yeniden açılabilir.",
    );
  }
  if (
    input.action === "close" &&
    !["draft", "active", "paused"].includes(input.status)
  ) {
    return policyFailure(
      409,
      "CAMPAIGN_NOT_CLOSABLE",
      "Kampanyanın mevcut durumu kapatmaya uygun değil.",
    );
  }
  if (input.action === "prepare_standard_video") {
    if (
      input.pricingModel !== "free" ||
      input.videoDelivery !== "video" ||
      input.operationType !== "standard_video" ||
      !nonBlank(input.messageTemplate)
    ) {
      return policyFailure(
        409,
        "STANDARD_VIDEO_CONFIGURATION_REQUIRED",
        "Bu işlem yalnızca mesaj şablonu tanımlı, serbest tutarlı standart video kampanyasında kullanılabilir.",
      );
    }
    if (!["active", "paused", "closed"].includes(input.status)) {
      return policyFailure(
        409,
        "CAMPAIGN_NOT_PREPARABLE",
        "Kampanyanın mevcut durumu standart videoya hazırlanmaya uygun değil.",
      );
    }
  }
  return { ok: true };
}

export function nextGroupCodeFailure(
  currentFailures: number,
  now: Date = new Date(),
) {
  const failures = Math.min(3, Math.max(0, currentFailures) + 1);
  const lockedUntil =
    failures >= 3 ? new Date(now.getTime() + 5 * 60_000) : null;
  return {
    failures,
    lockedUntil: lockedUntil?.toISOString() ?? null,
    status: lockedUntil ? 423 : 400,
    retryAfterSeconds: lockedUntil ? 5 * 60 : undefined,
  };
}

export function closeNeedsAcknowledgement(acknowledge: boolean) {
  return acknowledge !== true;
}

export function multiplyDecimalByInteger(
  value: string | null,
  multiplier: number,
) {
  if (value === null || !Number.isSafeInteger(multiplier)) return null;
  const match = value.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const scale = match[3]?.length ?? 0;
  const digits = `${match[2]}${match[3] ?? ""}`;
  let product = BigInt(digits) * BigInt(multiplier);
  if (match[1] === "-") product = -product;
  const negative = product < BigInt(0);
  const absolute = (negative ? -product : product)
    .toString()
    .padStart(scale + 1, "0");
  if (scale === 0) return `${negative ? "-" : ""}${absolute}`;
  const integerPart = absolute.slice(0, -scale) || "0";
  const fractionPart = absolute.slice(-scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${integerPart}${
    fractionPart ? `.${fractionPart}` : ""
  }`;
}

async function appendAudit(
  client: PoolClient,
  input: {
    action: string;
    actor: OperationActor;
    targetCollection: "operation-groups" | "campaigns";
    targetId: string;
    details: Record<string, unknown>;
    ipAddress?: string | null;
  },
) {
  await client.query(
    `insert into public.audit_logs (
       action,
       actor_email,
       target_collection,
       target_id,
       details,
       ip_address
     ) values ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      input.action,
      input.actor.email || null,
      input.targetCollection,
      input.targetId,
      JSON.stringify({
        actorId: input.actor.id,
        actorRole: input.actor.role,
        ...input.details,
      }),
      input.ipAddress || null,
    ],
  );
}

async function lockCampaign(
  client: PoolClient,
  campaignId: number | string,
) {
  const result = await client.query<CampaignRow>(
    `select
       c.id::text as id,
       c.status::text as status,
       c.is_donation_open as "isDonationOpen",
       c.pricing_model::text as "pricingModel",
       c.video_delivery::text as "videoDelivery",
       c.operation_type::text as "operationType",
       c.unit_price::text as "unitPrice",
       c.currency::text as currency,
       c.group_capacity as "groupCapacity",
       c.message_template as "messageTemplate",
       c.slaughter_script as "slaughterScript",
       c.slaughter_script_version as "slaughterScriptVersion"
     from public.campaigns c
     where c.id = $1
     for update`,
    [campaignId],
  );
  return result.rows[0] ?? null;
}

async function lockGroupContext(
  client: PoolClient,
  groupId: number,
): Promise<LockedGroupContext | null> {
  const lookup = await client.query<{ campaignId: string }>(
    `select campaign_id::text as "campaignId"
     from public.operation_groups
     where id = $1`,
    [groupId],
  );
  const campaignId = lookup.rows[0]?.campaignId;
  if (!campaignId) return null;

  // All operation paths take the parent campaign before a group. This matches
  // reservation allocation and gives campaign close a stable serialization point.
  const campaign = await lockCampaign(client, campaignId);
  if (!campaign) return null;

  const groupResult = await client.query<GroupRow>(
    `select
       g.id::text as id,
       g.campaign_id::text as "campaignId",
       g.code,
       g.ordinal,
       g.capacity,
       g.reserved_count as "reservedCount",
       g.confirmed_count as "confirmedCount",
       g.status::text as status,
       coalesce(g.operation_type::text, c.operation_type::text) as "operationType",
       g.capacity_override_original as "capacityOverrideOriginal",
       g.slaughter_scheduled_at as "slaughterScheduledAt",
       g.slaughter_order as "slaughterOrder",
       g.slaughter_place as "slaughterPlace",
       g.assigned_operator_id::text as "assignedOperatorId",
       g.field_notes as "fieldNotes",
       g.slaughtered_at as "slaughteredAt",
       g.slaughtered_by_id::text as "slaughteredById",
       g.slaughter_script_snapshot as "slaughterScriptSnapshot",
       coalesce(g.group_code_confirmation_failures, 0) as "groupCodeFailures",
       g.group_code_locked_until as "groupCodeLockedUntil",
       g.dispatch_state::text as "dispatchState",
       g.active_video_id::text as "activeVideoId",
       clock_timestamp() as "databaseNow"
     from public.operation_groups g
     join public.campaigns c on c.id = g.campaign_id
     where g.id = $1
       and g.campaign_id = $2
     for update of g`,
    [groupId, campaignId],
  );
  const group = groupResult.rows[0];
  return group ? { campaign, group } : null;
}

async function scheduleSlaughter(
  client: PoolClient,
  context: LockedGroupContext,
  operation: ScheduleSlaughterOperation,
  actor: OperationActor,
  actorId: number,
  ipAddress?: string | null,
): Promise<OperationResult<Record<string, unknown>>> {
  const access = evaluateAssignedOperatorPolicy({
    actor,
    assignedOperatorId: context.group.assignedOperatorId,
  });
  if (!access.ok) return fromPolicy(access);
  if (context.group.operationType !== "slaughter_video") {
    return failure(
      409,
      "NOT_A_SLAUGHTER_OPERATION",
      "Bu grup kesim videosu operasyonuna ait değil.",
    );
  }
  if (
    context.group.slaughteredAt ||
    !SCHEDULABLE_STATUSES.has(context.group.status)
  ) {
    return failure(
      409,
      "SLAUGHTER_SCHEDULE_LOCKED",
      "Kesim kaydı oluşturulmuş veya teslimata ilerlemiş grubun planı değiştirilemez.",
    );
  }
  if (
    !Number.isFinite(Date.parse(operation.scheduledAt)) ||
    !Number.isSafeInteger(operation.order) ||
    operation.order <= 0 ||
    !nonBlank(operation.place) ||
    operation.place.trim().length > 500 ||
    !Number.isSafeInteger(operation.assignedOperatorId) ||
    operation.assignedOperatorId <= 0 ||
    (operation.note !== undefined &&
      operation.note !== null &&
      operation.note.length > 4_000)
  ) {
    return failure(
      400,
      "INVALID_SLAUGHTER_SCHEDULE",
      "Geçerli tarih, sıra, yer ve sorumlu bilgileri zorunludur.",
    );
  }
  if (
    actor.role === "field_operator" &&
    operation.assignedOperatorId !== actorId
  ) {
    return failure(
      403,
      "OPERATOR_REASSIGNMENT_FORBIDDEN",
      "Saha görevlisi grubu başka bir sorumluya devredemez.",
    );
  }

  const responsible = await client.query<{ id: string }>(
    `select id::text as id
     from public.users
     where id = $1
       and is_active is true
       and role::text = 'field_operator'`,
    [operation.assignedOperatorId],
  );
  if (!responsible.rows[0]) {
    return failure(
      400,
      "INVALID_ASSIGNED_OPERATOR",
      "Sorumlu kişi aktif bir saha görevlisi olmalıdır.",
    );
  }

  const previous = {
    scheduledAt: iso(context.group.slaughterScheduledAt),
    order: context.group.slaughterOrder,
    place: context.group.slaughterPlace,
    assignedOperatorId: context.group.assignedOperatorId,
    note: context.group.fieldNotes,
    status: context.group.status,
  };
  const scheduledAt = new Date(operation.scheduledAt).toISOString();
  const place = operation.place.trim();
  const note =
    operation.note === undefined || operation.note === null
      ? null
      : operation.note.trim() || null;

  await client.query(
    `update public.operation_groups
     set operation_type = 'slaughter_video',
         slaughter_scheduled_at = $2,
         slaughter_order = $3,
         slaughter_place = $4,
         assigned_operator_id = $5,
         field_notes = $6,
         status = 'scheduled',
         updated_at = now()
     where id = $1`,
    [
      context.group.id,
      scheduledAt,
      operation.order,
      place,
      operation.assignedOperatorId,
      note,
    ],
  );
  const next = {
    scheduledAt,
    order: operation.order,
    place,
    assignedOperatorId: String(operation.assignedOperatorId),
    note,
    status: "scheduled",
  };
  await appendAudit(client, {
    action: "delivery.operation.slaughter_scheduled",
    actor,
    targetCollection: "operation-groups",
    targetId: context.group.id,
    ipAddress,
    details: {
      campaignId: context.campaign.id,
      previous,
      next,
    },
  });
  return success({
    groupId: context.group.id,
    campaignId: context.campaign.id,
    ...next,
  });
}

async function markSlaughtered(
  client: PoolClient,
  context: LockedGroupContext,
  operation: MarkSlaughteredOperation,
  actor: OperationActor,
  actorId: number,
  ipAddress?: string | null,
): Promise<OperationResult<Record<string, unknown>>> {
  const access = evaluateAssignedOperatorPolicy({
    actor,
    assignedOperatorId: context.group.assignedOperatorId,
  });
  if (!access.ok) return fromPolicy(access);

  const readiness = evaluateSlaughterReadiness({
    operationType: context.group.operationType,
    status: context.group.status,
    capacity: context.group.capacity,
    confirmedCount: context.group.confirmedCount,
    reservedCount: context.group.reservedCount,
    slaughteredAt: context.group.slaughteredAt,
    slaughterScript: context.campaign.slaughterScript,
    slaughterScriptVersion: context.campaign.slaughterScriptVersion,
  });
  if (!readiness.ok) return fromPolicy(readiness);

  const databaseNow = new Date(context.group.databaseNow);
  const lockedUntil = context.group.groupCodeLockedUntil
    ? new Date(context.group.groupCodeLockedUntil)
    : null;
  if (lockedUntil && lockedUntil.getTime() > databaseNow.getTime()) {
    const retryAfterSeconds = secondsBetween(lockedUntil, databaseNow);
    return failure(
      423,
      "GROUP_CODE_LOCKED",
      "Grup kodu denemeleri geçici olarak kilitlendi.",
      { lockedUntil: lockedUntil.toISOString() },
      retryAfterSeconds,
    );
  }

  if (!exactTextEqual(operation.groupCode, context.group.code)) {
    const currentFailures = lockedUntil
      ? 0
      : Number(context.group.groupCodeFailures || 0);
    const rejected = nextGroupCodeFailure(currentFailures, databaseNow);
    await client.query(
      `update public.operation_groups
       set group_code_confirmation_failures = $2,
           group_code_locked_until = $3,
           updated_at = now()
       where id = $1`,
      [context.group.id, rejected.failures, rejected.lockedUntil],
    );
    await appendAudit(client, {
      action: "delivery.operation.slaughter_group_code_rejected",
      actor,
      targetCollection: "operation-groups",
      targetId: context.group.id,
      ipAddress,
      details: {
        campaignId: context.campaign.id,
        failures: rejected.failures,
        lockedUntil: rejected.lockedUntil,
      },
    });
    return failure(
      rejected.status,
      rejected.lockedUntil ? "GROUP_CODE_LOCKED" : "GROUP_CODE_MISMATCH",
      rejected.lockedUntil
        ? "Grup kodu üç kez yanlış girildi. Beş dakika sonra yeniden deneyin."
        : `Grup kodu eşleşmiyor. ${3 - rejected.failures} deneme hakkınız kaldı.`,
      {
        failures: rejected.failures,
        lockedUntil: rejected.lockedUntil,
      },
      rejected.retryAfterSeconds,
    );
  }

  const markedAt = databaseNow.toISOString();
  const slaughterScriptSnapshot =
    context.campaign.slaughterScript?.trim() ?? "";
  await client.query(
    `update public.operation_groups
     set operation_type = 'slaughter_video',
         status = 'video_pending',
         slaughtered_at = $2,
         slaughtered_by_id = $3,
         slaughter_script_snapshot = $4,
         slaughter_reverted_at = null,
         slaughter_reverted_by_id = null,
         slaughter_revert_reason = null,
         group_code_confirmation_failures = 0,
         group_code_locked_until = null,
         updated_at = now()
     where id = $1`,
    [context.group.id, markedAt, actorId, slaughterScriptSnapshot],
  );
  await appendAudit(client, {
    action: "delivery.operation.slaughter_marked",
    actor,
    targetCollection: "operation-groups",
    targetId: context.group.id,
    ipAddress,
    details: {
      campaignId: context.campaign.id,
      previousStatus: context.group.status,
      nextStatus: "video_pending",
      capacity: context.group.capacity,
      confirmedCount: context.group.confirmedCount,
      reservedCount: context.group.reservedCount,
      slaughteredAt: markedAt,
      slaughterScriptVersion: context.campaign.slaughterScriptVersion,
      slaughterScriptSnapshot,
    },
  });
  return success({
    groupId: context.group.id,
    campaignId: context.campaign.id,
    status: "video_pending",
    slaughteredAt: markedAt,
    slaughteredById: String(actorId),
    slaughterScriptVersion: context.campaign.slaughterScriptVersion,
  });
}

async function revertSlaughter(
  client: PoolClient,
  context: LockedGroupContext,
  operation: RevertSlaughterOperation,
  actor: OperationActor,
  actorId: number,
  ipAddress?: string | null,
): Promise<OperationResult<Record<string, unknown>>> {
  if (actor.role !== "admin") {
    return failure(
      403,
      "ADMIN_REQUIRED",
      "Kesim kaydını yalnızca yönetici geri alabilir.",
    );
  }
  const reason = operation.reason.trim();
  if (!reason) {
    return failure(
      400,
      "REASON_REQUIRED",
      "Kesim kaydını geri almak için gerekçe zorunludur.",
    );
  }
  if (
    !context.group.slaughteredAt ||
    !["slaughtered", "video_pending", "video_ready"].includes(
      context.group.status,
    )
  ) {
    return failure(
      409,
      "SLAUGHTER_NOT_REVERTIBLE",
      "Grubun mevcut kesim durumu geri almaya uygun değil.",
    );
  }

  const delivery = await client.query<{ started: boolean }>(
    `select (
       $2::text <> 'idle'
       or exists (
         select 1
         from public.delivery_messages m
         where m.group_id = $1
           and m.status::text <> 'draft'
       )
     ) as started`,
    [context.group.id, context.group.dispatchState],
  );
  if (delivery.rows[0]?.started) {
    return failure(
      409,
      "DELIVERY_ALREADY_STARTED",
      "Teslimat başladıktan sonra kesim kaydı geri alınamaz.",
    );
  }

  const revertedAt = new Date(context.group.databaseNow).toISOString();
  await client.query(
    `update public.operation_groups
     set status = 'scheduled',
         slaughtered_at = null,
         slaughtered_by_id = null,
         slaughter_reverted_at = $2,
         slaughter_reverted_by_id = $3,
         slaughter_revert_reason = $4,
         updated_at = now()
     where id = $1`,
    [context.group.id, revertedAt, actorId, reason],
  );
  await appendAudit(client, {
    action: "delivery.operation.slaughter_reverted",
    actor,
    targetCollection: "operation-groups",
    targetId: context.group.id,
    ipAddress,
    details: {
      campaignId: context.campaign.id,
      reason,
      previousStatus: context.group.status,
      nextStatus: "scheduled",
      previousSlaughteredAt: iso(context.group.slaughteredAt),
      previousSlaughteredById: context.group.slaughteredById,
      retainedSlaughterScriptSnapshot: context.group.slaughterScriptSnapshot,
      revertedAt,
    },
  });
  return success({
    groupId: context.group.id,
    campaignId: context.campaign.id,
    status: "scheduled",
    revertedAt,
    reason,
  });
}

async function capacityOverride(
  client: PoolClient,
  groupId: number,
  operation: CapacityOverrideOperation,
  actor: OperationActor,
  actorId: number,
  ipAddress?: string | null,
): Promise<OperationResult<Record<string, unknown>>> {
  const lookup = await client.query<{ campaignId: string }>(
    `select campaign_id::text as "campaignId"
     from public.operation_groups
     where id = $1`,
    [groupId],
  );
  const campaignId = lookup.rows[0]?.campaignId;
  if (!campaignId) {
    return failure(404, "GROUP_NOT_FOUND", "Operasyon grubu bulunamadı.");
  }
  const campaign = await lockCampaign(client, campaignId);
  if (!campaign) {
    return failure(404, "CAMPAIGN_NOT_FOUND", "Kampanya bulunamadı.");
  }

  const groupsResult = await client.query<GroupRow>(
    `select
       g.id::text as id,
       g.campaign_id::text as "campaignId",
       g.code,
       g.ordinal,
       g.capacity,
       g.reserved_count as "reservedCount",
       g.confirmed_count as "confirmedCount",
       g.status::text as status,
       coalesce(g.operation_type::text, $2::text) as "operationType",
       g.capacity_override_original as "capacityOverrideOriginal",
       g.slaughter_scheduled_at as "slaughterScheduledAt",
       g.slaughter_order as "slaughterOrder",
       g.slaughter_place as "slaughterPlace",
       g.assigned_operator_id::text as "assignedOperatorId",
       g.field_notes as "fieldNotes",
       g.slaughtered_at as "slaughteredAt",
       g.slaughtered_by_id::text as "slaughteredById",
       g.slaughter_script_snapshot as "slaughterScriptSnapshot",
       coalesce(g.group_code_confirmation_failures, 0) as "groupCodeFailures",
       g.group_code_locked_until as "groupCodeLockedUntil",
       g.dispatch_state::text as "dispatchState",
       g.active_video_id::text as "activeVideoId",
       clock_timestamp() as "databaseNow"
     from public.operation_groups g
     where g.campaign_id = $1
     order by g.id
     for update`,
    [campaignId, campaign.operationType],
  );
  const groups = groupsResult.rows;
  const group = groups.find((row) => row.id === String(groupId));
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Operasyon grubu bulunamadı.");
  }
  const lastIncomplete = groups
    .filter(
      (row) =>
        row.capacity !== null && row.confirmedCount < Number(row.capacity),
    )
    .sort(
      (left, right) =>
        right.ordinal - left.ordinal || Number(right.id) - Number(left.id),
    )[0];

  const reservations = await client.query<{ count: number }>(
    `select count(*)::int as count
     from public.operation_group_members m
     join public.donation_intents i on i.id = m.donation_intent_id
     where m.group_id = $1
       and m.status::text = 'reserved'
       and i.status::text = any($2::text[])
       and (
         i.status::text = 'callback_received'
         or coalesce(m.reservation_expires_at, i.reservation_expires_at) > now()
       )`,
    [groupId, ACTIVE_RESERVATION_STATUSES],
  );
  const activeReservationCount = Number(reservations.rows[0]?.count || 0);
  const policy = evaluateCapacityOverridePolicy({
    actorRole: actor.role,
    isLastIncompleteGroup: lastIncomplete?.id === group.id,
    status: group.status,
    oldCapacity: group.capacity,
    originalCapacity: group.capacityOverrideOriginal,
    confirmedCount: group.confirmedCount,
    reservedCount: group.reservedCount,
    activeReservationCount,
    newCapacity: operation.newCapacity,
    reason: operation.reason,
    associationCovers: operation.associationCovers,
  });
  if (!policy.ok) return fromPolicy(policy);

  const reason = operation.reason.trim();
  const oldCapacity = Number(group.capacity);
  const originalCapacity =
    group.capacityOverrideOriginal ?? oldCapacity;
  const nextStatus =
    operation.newCapacity === group.confirmedCount
      ? "full"
      : group.confirmedCount > 0
        ? "collecting"
        : "open";
  const financialDifference = multiplyDecimalByInteger(
    campaign.unitPrice,
    oldCapacity - operation.newCapacity,
  );
  await client.query(
    `update public.operation_groups
     set capacity = $2,
         status = $3,
         capacity_override_original = $4,
         capacity_override_reason = $5,
         capacity_override_covered_by_association = true,
         capacity_overridden_at = now(),
         capacity_overridden_by_id = $6,
         updated_at = now()
     where id = $1`,
    [
      group.id,
      operation.newCapacity,
      nextStatus,
      originalCapacity,
      reason,
      actorId,
    ],
  );
  await appendAudit(client, {
    action: "delivery.operation.capacity_overridden",
    actor,
    targetCollection: "operation-groups",
    targetId: group.id,
    ipAddress,
    details: {
      campaignId: campaign.id,
      reason,
      associationCovers: true,
      oldCapacity,
      newCapacity: operation.newCapacity,
      originalCapacity,
      confirmedCount: group.confirmedCount,
      reservedCount: group.reservedCount,
      activeReservationCount,
      previousStatus: group.status,
      nextStatus,
      campaignDefaultCapacity: campaign.groupCapacity,
      financialDifference: {
        amount: financialDifference,
        currency: campaign.currency,
        calculation: "(oldCapacity - newCapacity) * unitPrice",
        unitPrice: campaign.unitPrice,
      },
    },
  });
  return success({
    groupId: group.id,
    campaignId: campaign.id,
    oldCapacity,
    newCapacity: operation.newCapacity,
    originalCapacity,
    status: nextStatus,
    campaignDefaultCapacity: campaign.groupCapacity,
    financialDifference,
    currency: campaign.currency,
  });
}

export async function runGroupOperation(input: {
  groupId: number;
  operation: GroupOperation;
  actor: OperationActor;
  ipAddress?: string | null;
}): Promise<OperationResult<Record<string, unknown>>> {
  const actorId = actorDatabaseId(input.actor);
  if (!actorId) {
    return failure(403, "INVALID_ACTOR", "Geçerli bir kullanıcı oturumu gerekli.");
  }
  if (!Number.isSafeInteger(input.groupId) || input.groupId <= 0) {
    return failure(400, "INVALID_GROUP_ID", "Geçerli bir grup kimliği gerekli.");
  }

  return withDatabaseTransaction(async (client) => {
    if (input.operation.action === "capacity_override") {
      return capacityOverride(
        client,
        input.groupId,
        input.operation,
        input.actor,
        actorId,
        input.ipAddress,
      );
    }
    const context = await lockGroupContext(client, input.groupId);
    if (!context) {
      return failure(404, "GROUP_NOT_FOUND", "Operasyon grubu bulunamadı.");
    }
    switch (input.operation.action) {
      case "schedule_slaughter":
        return scheduleSlaughter(
          client,
          context,
          input.operation,
          input.actor,
          actorId,
          input.ipAddress,
        );
      case "mark_slaughtered":
        return markSlaughtered(
          client,
          context,
          input.operation,
          input.actor,
          actorId,
          input.ipAddress,
        );
      case "revert_slaughter":
        return revertSlaughter(
          client,
          context,
          input.operation,
          input.actor,
          actorId,
          input.ipAddress,
        );
    }
  });
}

async function campaignCloseSummary(
  client: PoolClient,
  campaignId: string,
): Promise<CampaignCloseSummary> {
  const groups = await client.query<{
    id: string;
    code: string;
    ordinal: number;
    capacity: number;
    confirmedCount: number;
    reservedCount: number;
    status: string;
  }>(
    `select
       id::text as id,
       code,
       ordinal,
       capacity,
       confirmed_count as "confirmedCount",
       reserved_count as "reservedCount",
       status::text as status
     from public.operation_groups
     where campaign_id = $1
       and capacity is not null
       and confirmed_count < capacity
     order by ordinal, id
     for update`,
    [campaignId],
  );
  const reservations = await client.query<{
    intentCount: number;
    reservedUnits: number;
    earliestExpiry: Date | string | null;
  }>(
    `select
       count(*)::int as "intentCount",
       coalesce(sum(quantity), 0)::int as "reservedUnits",
       min(reservation_expires_at) as "earliestExpiry"
     from public.donation_intents
     where campaign_id = $1
       and status::text = any($2::text[])
       and (
         status::text = 'callback_received'
         or reservation_expires_at is null
         or reservation_expires_at > now()
       )`,
    [campaignId, ACTIVE_RESERVATION_STATUSES],
  );
  const live = reservations.rows[0];
  return {
    incompleteGroups: groups.rows,
    liveReservations: {
      intentCount: Number(live?.intentCount || 0),
      reservedUnits: Number(live?.reservedUnits || 0),
      earliestExpiry: iso(live?.earliestExpiry),
    },
  };
}

async function pauseCampaign(
  client: PoolClient,
  campaign: CampaignRow,
  reason: string,
  actor: OperationActor,
  actorId: number,
  ipAddress?: string | null,
) {
  const changedAt = new Date().toISOString();
  await client.query(
    `update public.campaigns
     set status = 'paused',
         is_donation_open = false,
         pause_reason = $2,
         paused_at = $3,
         paused_by_id = $4,
         updated_at = now()
     where id = $1`,
    [campaign.id, reason, changedAt, actorId],
  );
  await appendAudit(client, {
    action: "delivery.campaign.paused",
    actor,
    targetCollection: "campaigns",
    targetId: campaign.id,
    ipAddress,
    details: {
      reason,
      previousStatus: campaign.status,
      nextStatus: "paused",
      previousDonationOpen: campaign.isDonationOpen,
      nextDonationOpen: false,
      changedAt,
    },
  });
  return success({
    campaignId: campaign.id,
    status: "paused",
    isDonationOpen: false,
    changedAt,
  });
}

async function resumeCampaign(
  client: PoolClient,
  campaign: CampaignRow,
  reason: string,
  actor: OperationActor,
  ipAddress?: string | null,
) {
  const changedAt = new Date().toISOString();
  await client.query(
    `update public.campaigns
     set status = 'active',
         is_donation_open = true,
         updated_at = now()
     where id = $1`,
    [campaign.id],
  );
  await appendAudit(client, {
    action: "delivery.campaign.resumed",
    actor,
    targetCollection: "campaigns",
    targetId: campaign.id,
    ipAddress,
    details: {
      reason,
      previousStatus: campaign.status,
      nextStatus: "active",
      previousDonationOpen: campaign.isDonationOpen,
      nextDonationOpen: true,
      changedAt,
    },
  });
  return success({
    campaignId: campaign.id,
    status: "active",
    isDonationOpen: true,
    changedAt,
  });
}

async function closeCampaign(
  client: PoolClient,
  campaign: CampaignRow,
  operation: Extract<CampaignOperation, { action: "close" }>,
  actor: OperationActor,
  actorId: number,
  ipAddress?: string | null,
): Promise<OperationResult<Record<string, unknown>>> {
  const summary = await campaignCloseSummary(client, campaign.id);
  if (closeNeedsAcknowledgement(operation.acknowledge)) {
    return failure(
      409,
      "CLOSE_ACKNOWLEDGEMENT_REQUIRED",
      "Kampanya kapanış özetini onaylayarak işlemi tekrar gönderin.",
      {
        requiresAcknowledgement: true,
        summary,
      },
    );
  }
  const changedAt = new Date().toISOString();
  const reason = operation.reason.trim();
  await client.query(
    `update public.campaigns
     set status = 'closed',
         is_donation_open = false,
         close_reason = $2,
         closed_at = $3,
         closed_by_id = $4,
         updated_at = now()
     where id = $1`,
    [campaign.id, reason, changedAt, actorId],
  );
  await appendAudit(client, {
    action: "delivery.campaign.closed",
    actor,
    targetCollection: "campaigns",
    targetId: campaign.id,
    ipAddress,
    details: {
      reason,
      acknowledged: true,
      summary,
      previousStatus: campaign.status,
      nextStatus: "closed",
      previousDonationOpen: campaign.isDonationOpen,
      nextDonationOpen: false,
      changedAt,
      financialRecordsDeleted: false,
    },
  });
  return success({
    campaignId: campaign.id,
    status: "closed",
    isDonationOpen: false,
    changedAt,
    summary,
  });
}

async function prepareStandardVideo(
  client: PoolClient,
  campaign: CampaignRow,
  reason: string,
  actor: OperationActor,
  actorId: number,
  ipAddress?: string | null,
): Promise<OperationResult<Record<string, unknown>>> {
  const existingResult = await client.query<{
    id: string;
    status: string;
    operationType: string | null;
    dispatchState: string;
  }>(
    `select
       id::text as id,
       status::text as status,
       operation_type::text as "operationType",
       dispatch_state::text as "dispatchState"
     from public.operation_groups
     where campaign_id = $1
       and capacity is null
     for update`,
    [campaign.id],
  );
  const existing = existingResult.rows[0];
  if (
    existing &&
    ((existing.operationType &&
      existing.operationType !== "standard_video") ||
      existing.dispatchState !== "idle" ||
      !["open", "collecting", "video_pending", "action_required"].includes(
        existing.status,
      ))
  ) {
    return failure(
      409,
      "STANDARD_GROUP_NOT_PREPARABLE",
      "Standart video grubu teslimata ilerlediği için yeniden hazırlanamaz.",
    );
  }

  let groupId = existing?.id ?? null;
  let groupCreated = false;
  if (!groupId) {
    const yearResult = await client.query<{ year: number }>(
      "select extract(year from current_date)::int as year",
    );
    const year = Number(yearResult.rows[0]?.year);
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1::text))",
      [`operation-group-year:${year}`],
    );
    const ordinalResult = await client.query<{ ordinal: number }>(
      `select coalesce(max(ordinal), 0)::int + 1 as ordinal
       from public.operation_groups
       where year = $1`,
      [year],
    );
    const ordinal = Number(ordinalResult.rows[0]?.ordinal);
    const code = `MD-${year}-${String(ordinal).padStart(4, "0")}`;
    const inserted = await client.query<{ id: string }>(
      `insert into public.operation_groups (
         campaign_id,
         code,
         year,
         ordinal,
         capacity,
         status,
         message_template,
         operation_type
       ) values ($1, $2, $3, $4, null, 'video_pending', $5, 'standard_video')
       returning id::text as id`,
      [campaign.id, code, year, ordinal, campaign.messageTemplate],
    );
    groupId = inserted.rows[0]?.id ?? null;
    groupCreated = true;
  } else {
    await client.query(
      `update public.operation_groups
       set operation_type = 'standard_video',
           status = 'video_pending',
           message_template = $2,
           updated_at = now()
       where id = $1`,
      [groupId, campaign.messageTemplate],
    );
  }
  if (!groupId) throw new Error("Standart video grubu oluşturulamadı.");

  const changedAt = new Date().toISOString();
  await client.query(
    `update public.campaigns
     set status = 'closed',
         is_donation_open = false,
         close_reason = case
           when status::text = 'closed' and nullif(btrim(close_reason), '') is not null
             then close_reason
           else $2
         end,
         closed_at = case
           when status::text = 'closed' and closed_at is not null
             then closed_at
           else $3
         end,
         closed_by_id = case
           when status::text = 'closed' and closed_by_id is not null
             then closed_by_id
           else $4
         end,
         updated_at = now()
     where id = $1`,
    [campaign.id, reason, changedAt, actorId],
  );
  await appendAudit(client, {
    action: "delivery.campaign.standard_video_prepared",
    actor,
    targetCollection: "campaigns",
    targetId: campaign.id,
    ipAddress,
    details: {
      reason,
      manualAction: true,
      automaticTargetTrigger: false,
      groupId,
      groupCreated,
      previousGroupStatus: existing?.status ?? null,
      nextGroupStatus: "video_pending",
      previousStatus: campaign.status,
      nextStatus: "closed",
      previousDonationOpen: campaign.isDonationOpen,
      nextDonationOpen: false,
      changedAt,
      financialRecordsDeleted: false,
    },
  });
  await appendAudit(client, {
    action: "delivery.operation.standard_video_pending",
    actor,
    targetCollection: "operation-groups",
    targetId: groupId,
    ipAddress,
    details: {
      campaignId: campaign.id,
      reason,
      groupCreated,
      previousStatus: existing?.status ?? null,
      nextStatus: "video_pending",
    },
  });
  return success({
    campaignId: campaign.id,
    groupId,
    groupCreated,
    campaignStatus: "closed",
    groupStatus: "video_pending",
    isDonationOpen: false,
    changedAt,
  });
}

export async function runCampaignOperation(input: {
  campaignId: number;
  operation: CampaignOperation;
  actor: OperationActor;
  ipAddress?: string | null;
}): Promise<OperationResult<Record<string, unknown>>> {
  const actorId = actorDatabaseId(input.actor);
  if (!actorId) {
    return failure(403, "INVALID_ACTOR", "Geçerli bir kullanıcı oturumu gerekli.");
  }
  if (!Number.isSafeInteger(input.campaignId) || input.campaignId <= 0) {
    return failure(
      400,
      "INVALID_CAMPAIGN_ID",
      "Geçerli bir kampanya kimliği gerekli.",
    );
  }
  if (input.actor.role !== "admin") {
    return failure(
      403,
      "ADMIN_REQUIRED",
      "Kampanya operasyonları yalnızca yönetici tarafından uygulanabilir.",
    );
  }
  if (!nonBlank(input.operation.reason)) {
    return failure(
      400,
      "REASON_REQUIRED",
      "Bu işlem için gerekçe zorunludur.",
    );
  }

  return withDatabaseTransaction(async (client) => {
    const campaign = await lockCampaign(client, input.campaignId);
    if (!campaign) {
      return failure(404, "CAMPAIGN_NOT_FOUND", "Kampanya bulunamadı.");
    }
    const policy = evaluateCampaignActionPolicy({
      actorRole: input.actor.role,
      action: input.operation.action,
      reason: input.operation.reason,
      status: campaign.status,
      pricingModel: campaign.pricingModel,
      videoDelivery: campaign.videoDelivery,
      operationType: campaign.operationType,
      messageTemplate: campaign.messageTemplate,
    });
    if (!policy.ok) return fromPolicy(policy);

    const reason = input.operation.reason.trim();
    switch (input.operation.action) {
      case "pause":
        return pauseCampaign(
          client,
          campaign,
          reason,
          input.actor,
          actorId,
          input.ipAddress,
        );
      case "resume":
        return resumeCampaign(
          client,
          campaign,
          reason,
          input.actor,
          input.ipAddress,
        );
      case "close":
        return closeCampaign(
          client,
          campaign,
          input.operation,
          input.actor,
          actorId,
          input.ipAddress,
        );
      case "prepare_standard_video":
        return prepareStandardVideo(
          client,
          campaign,
          reason,
          input.actor,
          actorId,
          input.ipAddress,
        );
    }
  });
}
