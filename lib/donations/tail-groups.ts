import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { GroupPlanError, validateTailPlan } from "./group-plan";

export async function loadTailGroups(client: PoolClient, campaignId: number) {
  const campaign = (
    await client.query(
      `select id,status,is_donation_open,pricing_model,video_delivery,operation_type,group_capacity,unit_price,currency,reserved_units,confirmed_units from public.campaigns where id=$1 for update`,
      [campaignId],
    )
  ).rows[0];
  if (
    !campaign ||
    campaign.pricing_model !== "fixed" ||
    campaign.video_delivery !== "video"
  )
    throw new GroupPlanError("Sabit tutarlı, videolu bir kampanya seçin.");
  if (campaign.status !== "closed" || campaign.is_donation_open)
    throw new GroupPlanError(
      "Önce kampanyanın bağış alımını kapatın. Son grup düzenlemesinden sonra yeni alım için yeni kampanya açılır.",
    );
  const pending = (
    await client.query(
      `select id from public.donation_intents where campaign_id=$1 and status::text not in ('completed','expired','cancelled','failed') limit 1`,
      [campaignId],
    )
  ).rows[0];
  if (Number(campaign.reserved_units) !== 0 || pending)
    throw new GroupPlanError(
      "Bekleyen ödeme/rezervasyonları önce sonuçlandırın.",
    );
  const groups = (
    await client.query(
      `select g.* from public.operation_groups g where campaign_id=$1 order by year desc,ordinal desc,id desc limit 2 for update`,
      [campaignId],
    )
  ).rows.reverse();
  if (groups.length !== 2)
    throw new GroupPlanError("Bu işlem için en az iki mevcut grup gereklidir.");
  const ids = groups.map((g) => Number(g.id));
  if (
    groups.some(
      (g) =>
        ![
          "open",
          "collecting",
          "full",
          "ready_for_slaughter",
          "video_pending",
        ].includes(g.status) ||
        g.dispatch_state !== "idle" ||
        g.dispatch_locked_at ||
        g.slaughter_scheduled_at ||
        g.slaughtered_at ||
        g.slaughter_reverted_at ||
        g.active_video_id ||
        g.public_link_token_hash ||
        g.capacity_override_original,
    )
  )
    throw new GroupPlanError(
      "Kesim, video, gönderim veya önceki kapasite istisnası bulunan grup değiştirilemez.",
    );
  const media = (
    await client.query(
      `select 1 from public.operation_videos where group_id=any($1::int[]) union all select 1 from public.delivery_messages where group_id=any($1::int[]) limit 1`,
      [ids],
    )
  ).rows[0];
  if (media)
    throw new GroupPlanError(
      "Video/mesaj geçmişi bulunan gruplar değiştirilemez.",
    );
  const members = (
    await client.query(
      `select m.id,m.group_id,m.participant_id,m.donation_id,m.unit_index,m.status,d.quantity,d.net_confirmed_amount,d.status as donation_status,p.name
    from public.operation_group_members m left join public.donations d on d.id=m.donation_id
    left join public.donation_participants p on p.id=m.participant_id
    where m.group_id=any($1::int[]) and m.status::text not in ('released','refunded') order by m.group_id,m.id limit 1001 for update of m`,
      [ids],
    )
  ).rows;
  if (
    members.some(
      (m) =>
        m.status !== "confirmed" ||
        m.donation_status !== "paid" ||
        !m.participant_id ||
        !m.quantity,
    )
  )
    throw new GroupPlanError(
      "Yalnız kesinleşmiş, katılımcısı bulunan ve iade edilmemiş hisseler düzenlenebilir.",
    );
  for (const group of groups) {
    if (
      Number(group.reserved_count) !== 0 ||
      members.filter((m) => m.group_id === group.id).length !==
        Number(group.confirmed_count)
    )
      throw new GroupPlanError("Grup sayaçları tutarsız; işlem durduruldu.");
  }
  if (members.length < 2 || members.length > 1000)
    throw new GroupPlanError(
      "İki grup için yeterli hisse bulunamadı veya işlem sınırı aşıldı.",
    );
  // Stable order: existing first group, then second. A changed plan only moves boundary members.
  members.sort(
    (a, b) => ids.indexOf(a.group_id) - ids.indexOf(b.group_id) || a.id - b.id,
  );
  const data = {
    campaignId,
    currency: String(campaign.currency),
    maximum: Number(campaign.group_capacity),
    minimum:
      campaign.operation_type === "slaughter_video" &&
      Number(campaign.group_capacity) > 1
        ? 2
        : 1,
    operationType: String(campaign.operation_type),
    groups: groups.map((g) => ({
      id: Number(g.id),
      code: String(g.code),
      capacity: Number(g.capacity),
      count: Number(g.confirmed_count),
      priceCents: Math.round(
        Number(g.tail_unit_price ?? campaign.unit_price) * 100,
      ),
      updatedAt: new Date(g.updated_at).toISOString(),
    })),
    members: members.map((m) => ({
      id: Number(m.id),
      groupId: Number(m.group_id),
      donationId: Number(m.donation_id),
      participantId: Number(m.participant_id),
      name: String(m.name || "Katılımcı"),
      // Exact cents per unit, remainder allocated to initial unit indexes. Actual donation row is never edited.
      receivedCents:
        Math.floor(
          Math.round(Number(m.net_confirmed_amount) * 100) / Number(m.quantity),
        ) +
        (Number(m.unit_index) <=
        Math.round(Number(m.net_confirmed_amount) * 100) % Number(m.quantity)
          ? 1
          : 0),
    })),
  };
  const version = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
  return { ...data, version };
}

export type TailGroupPreview = Awaited<ReturnType<typeof loadTailGroups>>;

export async function reviseTailGroups(
  client: PoolClient,
  input: {
    campaignId: number;
    version: string;
    counts: number[];
    prices: number[];
    reason: string;
    confirmed: boolean;
  },
  actor: { id: string | number; email: string },
) {
  if (
    !input.confirmed ||
    input.reason.trim().length < 5 ||
    input.reason.length > 1000
  )
    throw new GroupPlanError(
      "Açık onay ve 5–1000 karakterlik düzenleme nedeni zorunludur.",
    );
  const before = await loadTailGroups(client, input.campaignId);
  if (before.version !== input.version)
    throw new GroupPlanError(
      "Grup bilgileri değişti. Önizlemeyi yenileyip yeniden onaylayın.",
    );
  validateTailPlan(
    input.counts,
    input.prices,
    before.members.length,
    before.maximum,
    before.minimum,
  );
  const ids = before.groups.map((g) => g.id);
  // Temporarily raise counters' ceiling inside the transaction before moving members.
  // No other transaction can observe the intermediate state.
  await client.query(
    `update public.operation_groups set capacity=greatest(capacity,$2) where id=any($1::int[])`,
    [ids, before.members.length],
  );
  for (let i = 0; i < 2; i++) {
    const assigned = before.members.slice(
      i === 0 ? 0 : input.counts[0],
      i === 0 ? input.counts[0] : before.members.length,
    );
    await client.query(
      `update public.operation_group_members set group_id=$1,updated_at=now() where id=any($2::int[])`,
      [ids[i], assigned.map((m) => m.id)],
    );
    await client.query(
      `update public.operation_groups set capacity=$2,confirmed_count=$2,tail_unit_price=$3,operation_type=$4::public.enum_operation_groups_operation_type,status=case when $4='slaughter_video' then 'ready_for_slaughter'::public.enum_operation_groups_status else 'video_pending'::public.enum_operation_groups_status end,updated_at=clock_timestamp() where id=$1`,
      [ids[i], input.counts[i], input.prices[i] / 100, before.operationType],
    );
  }
  const after = {
    counts: input.counts,
    pricesCents: input.prices,
    groupIds: ids,
    memberIds: before.members.map((m) => m.id),
    splitAt: input.counts[0],
    receivedCents: before.members.reduce((sum, m) => sum + m.receivedCents, 0),
    expectedCents: input.counts.reduce(
      (sum, n, i) => sum + n * input.prices[i],
      0,
    ),
  };
  await client.query(
    `insert into public.operation_group_revisions(campaign_id,actor_id,reason,before_state,after_state) values($1,$2,$3,$4::jsonb,$5::jsonb)`,
    [
      input.campaignId,
      actor.id,
      input.reason.trim(),
      JSON.stringify(before),
      JSON.stringify(after),
    ],
  );
  await client.query(
    `insert into public.audit_logs(action,actor_email,target_collection,target_id,details) values('operation_groups.tail_revised',$1,'campaigns',$2,$3::jsonb)`,
    [
      actor.email,
      String(input.campaignId),
      JSON.stringify({ reason: input.reason, ...after }),
    ],
  );
  return after;
}
