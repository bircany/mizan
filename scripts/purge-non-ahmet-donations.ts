import { Client, type ClientBase } from "pg";

import { ensureLocalEnvLoaded, requiredEnv } from "../lib/env";
import { buildPostgresPoolConfig } from "../lib/postgres";

type CleanupIds = Record<string, number[]>;

const TABLES = [
  "delivery_messages",
  "operation_group_members",
  "donation_participants",
  "donation_fulfillments",
  "refund_requests",
  "payment_ledger_entries",
  "payment_events",
  "payload_locked_documents_rels",
  "donations",
  "payment_sessions",
  "donation_intents",
] as const;

async function ids(client: ClientBase, sql: string, values: unknown[]) {
  const result = await client.query<{ id: number }>(sql, values);
  return result.rows.map((row) => row.id);
}

async function collect(client: ClientBase): Promise<CleanupIds> {
  const keptCampaignIds = await ids(
    client,
    "select id from public.campaigns where code like 'ahmet-destek-%'",
    [],
  );
  const donationIntentIds = await ids(
    client,
    "select id from public.donation_intents where not (campaign_id = any($1::int[]))",
    [keptCampaignIds],
  );
  const donationIds = await ids(
    client,
    "select id from public.donations where not (campaign_id = any($1::int[]))",
    [keptCampaignIds],
  );
  const paymentSessionIds = await ids(
    client,
    "select id from public.payment_sessions where donation_intent_id = any($1::int[])",
    [donationIntentIds],
  );
  const donationParticipantIds = await ids(
    client,
    "select id from public.donation_participants where donation_intent_id = any($1::int[]) or donation_id = any($2::int[])",
    [donationIntentIds, donationIds],
  );
  const operationGroupMemberIds = await ids(
    client,
    "select id from public.operation_group_members where donation_intent_id = any($1::int[]) or donation_id = any($2::int[]) or participant_id = any($3::int[])",
    [donationIntentIds, donationIds, donationParticipantIds],
  );
  const refundRequestIds = await ids(
    client,
    "select id from public.refund_requests where donation_id = any($1::int[])",
    [donationIds],
  );

  return {
    delivery_messages: await ids(
      client,
      "select id from public.delivery_messages where donation_id = any($1::int[]) or participant_id = any($2::int[]) or member_id = any($3::int[])",
      [donationIds, donationParticipantIds, operationGroupMemberIds],
    ),
    operation_group_members: operationGroupMemberIds,
    donation_participants: donationParticipantIds,
    donation_fulfillments: await ids(
      client,
      "select id from public.donation_fulfillments where donation_id = any($1::int[])",
      [donationIds],
    ),
    refund_requests: refundRequestIds,
    payment_ledger_entries: await ids(
      client,
      "select id from public.payment_ledger_entries where donation_id = any($1::int[]) or refund_request_id = any($2::int[])",
      [donationIds, refundRequestIds],
    ),
    payment_events: await ids(
      client,
      "select id from public.payment_events where payment_session_id = any($1::int[])",
      [paymentSessionIds],
    ),
    payload_locked_documents_rels: await ids(
      client,
      "select id from public.payload_locked_documents_rels where donations_id = any($1::int[]) or donation_intents_id = any($2::int[])",
      [donationIds, donationIntentIds],
    ),
    donations: donationIds,
    payment_sessions: paymentSessionIds,
    donation_intents: donationIntentIds,
  };
}

async function deleteByIds(client: ClientBase, table: string, values: number[]) {
  if (!values.length) return 0;
  if (table === "payment_ledger_entries") {
    await client.query(
      "alter table public.payment_ledger_entries disable trigger payment_ledger_entries_append_only",
    );
  }
  try {
    const result = await client.query(
      `delete from public.${table} where id = any($1::int[])`,
      [values],
    );
    return result.rowCount ?? 0;
  } finally {
    if (table === "payment_ledger_entries") {
      await client.query(
        "alter table public.payment_ledger_entries enable trigger payment_ledger_entries_append_only",
      );
    }
  }
}

async function run() {
  const apply = process.argv.includes("--apply");
  ensureLocalEnvLoaded();
  const client = new Client(
    buildPostgresPoolConfig(requiredEnv("PAYLOAD_DATABASE_URI")),
  );
  await client.connect();

  const cleanup = await collect(client);
  console.log("Ahmet'e Destek dışındaki bağış kayıtları:");
  for (const table of TABLES) console.log(`- ${table}: ${cleanup[table].length}`);

  if (!apply) {
    console.log("Önizleme tamamlandı. Silmek için: pnpm tsx scripts/purge-non-ahmet-donations.ts --apply");
    await client.end();
    return;
  }

  await client.query("begin");
  try {
    for (const table of TABLES) {
      await deleteByIds(client, table, cleanup[table]);
    }
    await client.query(`
      update public.campaigns
      set collected_amount = 0, donor_count = 0, confirmed_units = 0, updated_at = now()
      where code not like 'ahmet-destek-%';
    `);
    await client.query(`
      delete from public.campaign_financial_totals
      where campaign_id not in (
        select id from public.campaigns where code like 'ahmet-destek-%'
      );
    `);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  console.log("Silme tamamlandı.");
  await client.end();
}

run().catch((error) => {
  console.error("Ahmet dışı bağış verileri temizlenemedi:", error);
  process.exit(1);
});
