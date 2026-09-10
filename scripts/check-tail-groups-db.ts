import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { loadTailGroups, reviseTailGroups } from "../lib/donations/tail-groups";
import { recordManualDonation } from "../lib/donations/manual-record";
import { parseManualDonation } from "../lib/donations/manual-validation";

// Fixed isolated loopback database only. Never loads application env or sends messages.
const pool = new Pool({
  host: "127.0.0.1",
  port: 55439,
  user: "postgres",
  database: "mizan_phase2_test",
});
async function tx<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='3s'");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
try {
  assert.equal(
    (await pool.query("select current_database() as name")).rows[0].name,
    "mizan_phase2_test",
  );
  const actor = {
    id: Number(
      (
        await pool.query(
          "insert into public.users(name,email,role) values('Tail test',$1,'admin') returning id",
          [`${randomUUID()}@example.invalid`],
        )
      ).rows[0].id,
    ),
    email: "tail@example.invalid",
  };
  async function createCampaign() {
    const code = randomUUID();
    return Number(
      (
        await pool.query(
          `insert into public.campaigns(code,slug,status,pricing_model,unit_price,unit_label,total_stock,video_delivery,operation_type,group_capacity,participant_required,message_template) values($1,$1,'active','fixed',2000,'hisse',18,'video','standard_video',6,true,'Test {{link}}') returning id`,
          [code],
        )
      ).rows[0].id,
    );
  }
  async function payment(campaignId: number, quantity = 13) {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      requestId: randomUUID(),
      campaignId: String(campaignId),
      currency: "TRY",
      quantity: String(quantity),
      donorName: "Test Bağışçı",
      phone: "05551234567",
      country: "TR",
      date: "2026-09-08",
      expectedAmount: String(quantity * 2000),
      receivedAmount: String(quantity * 2000),
      contactConsent: "on",
    }))
      form.set(key, value);
    const input = parseManualDonation(form, new Date("2026-09-10T10:00:00Z"));
    return tx((c) => recordManualDonation(c, input, actor));
  }
  const campaignId = await createCampaign();
  await payment(campaignId);
  await assert.rejects(
    tx((c) => loadTailGroups(c, campaignId)),
    /alımını kapatın/,
  );
  await assert.rejects(
    pool.query("update public.campaigns set group_capacity=7 where id=$1", [
      campaignId,
    ]),
    /allocation model/,
  );
  await assert.rejects(
    pool.query("update public.campaigns set total_stock=100 where id=$1", [
      campaignId,
    ]),
    /multiple/,
  );
  await pool.query(
    "update public.campaigns set status='closed',is_donation_open=false,close_reason='Test alım tamamlandı',closed_at=now(),closed_by_id=$2 where id=$1",
    [campaignId, actor.id],
  );
  const before = await tx((c) => loadTailGroups(c, campaignId));
  await assert.rejects(
    tx(async (c) => {
      await c.query(
        "update public.donation_intents set status='draft' where campaign_id=$1",
        [campaignId],
      );
      return loadTailGroups(c, campaignId);
    }),
    /Bekleyen/,
  );
  await assert.rejects(
    tx(async (c) => {
      await c.query(
        "update public.donations set status='partially_refunded' where campaign_id=$1",
        [campaignId],
      );
      return loadTailGroups(c, campaignId);
    }),
    /iade/,
  );
  await assert.rejects(
    tx(async (c) => {
      await c.query(
        "update public.operation_groups set dispatch_state='sending' where id=$1",
        [before.groups[0].id],
      );
      return loadTailGroups(c, campaignId);
    }),
    /Kesim/,
  );
  await assert.rejects(
    tx(async (c) => {
      await c.query(
        `insert into public.operation_videos(group_id,uploaded_by_id,upload_id,raw_storage_key,original_filename,mime_type,size_bytes,raw_delete_after,processed_delete_after) values($1,$2,$3,'fixture','fixture.mp4','video/mp4',100,now()+interval '1 day',now()+interval '1 day')`,
        [before.groups[0].id, actor.id, randomUUID()],
      );
      return loadTailGroups(c, campaignId);
    }),
    /Video\/mesaj/,
  );
  assert.deepEqual(
    before.groups.map((g) => g.count),
    [6, 1],
  );
  assert.deepEqual(
    before.groups.map((g) => g.priceCents),
    [200000, 200000],
  );
  const financialBefore = (
    await pool.query(
      "select d.* from public.donations d where campaign_id=$1",
      [campaignId],
    )
  ).rows;
  const ledgerBefore = (
    await pool.query(
      "select * from public.payment_ledger_entries where campaign_id=$1",
      [campaignId],
    )
  ).rows;
  const earlierGroup = (
    await pool.query(
      "select * from public.operation_groups where campaign_id=$1 order by id limit 1",
      [campaignId],
    )
  ).rows;
  const input = {
    campaignId,
    version: before.version,
    counts: [4, 3],
    prices: [210000, 220000],
    reason: "Son iki grup dağılım düzeltmesi",
    confirmed: true,
  };
  await assert.rejects(
    tx((c) => reviseTailGroups(c, { ...input, confirmed: false }, actor)),
    /onay/,
  );
  await assert.rejects(
    tx((c) => reviseTailGroups(c, { ...input, counts: [4, 4] }, actor)),
    /korunmalıdır/,
  );
  await assert.rejects(
    tx((c) => reviseTailGroups(c, { ...input, prices: [0, 200000] }, actor)),
    /bedeli/,
  );
  await assert.rejects(
    tx(async (c) => {
      await reviseTailGroups(c, input, actor);
      throw new Error("injected rollback");
    }),
    /injected/,
  );
  assert.equal(
    (await tx((c) => loadTailGroups(c, campaignId))).version,
    before.version,
  );
  const results = await Promise.allSettled([
    tx((c) => reviseTailGroups(c, input, actor)),
    tx((c) => reviseTailGroups(c, input, actor)),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const after = await tx((c) => loadTailGroups(c, campaignId));
  assert.deepEqual(
    after.groups.map((g) => g.count),
    [4, 3],
  );
  assert.deepEqual(
    after.groups.map((g) => g.capacity),
    [4, 3],
  );
  assert.deepEqual(
    after.groups.map((g) => g.priceCents),
    input.prices,
  );
  assert.deepEqual(
    after.members.map((m) => m.id),
    before.members.map((m) => m.id),
  );
  assert.equal(
    after.members.reduce((n, m) => n + m.receivedCents, 0),
    1400000,
  );
  assert.deepEqual(
    (
      await pool.query(
        "select d.* from public.donations d where campaign_id=$1",
        [campaignId],
      )
    ).rows,
    financialBefore,
  );
  assert.deepEqual(
    (
      await pool.query(
        "select * from public.payment_ledger_entries where campaign_id=$1",
        [campaignId],
      )
    ).rows,
    ledgerBefore,
  );
  assert.deepEqual(
    (
      await pool.query(
        "select * from public.operation_groups where campaign_id=$1 order by id limit 1",
        [campaignId],
      )
    ).rows,
    earlierGroup,
  );
  await assert.rejects(
    pool.query(
      "update public.campaigns set status='active',is_donation_open=true where id=$1",
      [campaignId],
    ),
    /cannot reopen/,
  );
  await assert.rejects(
    pool.query(
      "update public.operation_group_revisions set reason='rewrite' where campaign_id=$1",
      [campaignId],
    ),
    /append-only/,
  );
  await assert.rejects(
    tx((c) => reviseTailGroups(c, input, actor)),
    /değişti/,
  );
  const current = {
    ...input,
    version: after.version,
    counts: [3, 4],
    prices: [200000, 200000],
  };
  await tx((c) => reviseTailGroups(c, current, actor)); // revised plans remain editable until operation starts
  const operator = await pool.connect();
  await operator.query("begin");
  await operator.query(
    "update public.operation_groups set slaughter_scheduled_at=now() where id=$1",
    [after.groups[1].id],
  );
  const competing = tx((c) => reviseTailGroups(c, current, actor));
  const rejected = assert.rejects(competing, /Kesim/);
  await operator.query("commit");
  operator.release();
  await rejected;
  await assert.rejects(
    tx((c) => loadTailGroups(c, campaignId)),
    /Kesim/,
  );
  await tx(async (c) => {
    await c.query("set local role anon");
    await assert.rejects(
      c.query("select * from public.operation_group_revisions"),
      /permission denied/,
    );
  });
  // Payment and closure share the campaign lock: a late payment cannot enter a closed plan.
  await assert.rejects(payment(campaignId, 1), /bağışa açık değil/);
  console.log(
    "PASS: PostgreSQL 6+1→4+3, exact member/receipt/ledger preservation, price revisions, stale & concurrent saves, rollback, rounding/model guards, lifecycle lock, RLS and immutable history.",
  );
} finally {
  await pool.end();
}
