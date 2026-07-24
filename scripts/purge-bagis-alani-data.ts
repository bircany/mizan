import { Client } from "pg";

import { ensureLocalEnvLoaded, requiredEnv } from "../lib/env";
import { buildPostgresPoolConfig } from "../lib/postgres";

const TRUNCATE_TABLES = [
  "public.payment_ledger_entries",
  "public.campaign_financial_totals",
  "public.payment_events",
  "public.payment_sessions",
  "public.donation_intents",
  "public.donations",
  "public.donor_reports_rels",
  "public.donor_reports",
  "public.refund_requests",
  "public.donation_fulfillments",
  "public.proof_submissions",
  "public.field_tasks",
  "public.campaigns_locales",
  "public.payload_locked_documents_rels",
  "public.campaigns",
];

async function main() {
  ensureLocalEnvLoaded();
  const databaseUrl = requiredEnv("PAYLOAD_DATABASE_URI");
  const client = new Client(buildPostgresPoolConfig(databaseUrl));

  await client.connect();

  const countsBefore = await client.query(`
    select
      'campaigns' as table_name, count(*)::int as total from public.campaigns
    union all select 'donations', count(*)::int from public.donations
    union all select 'donation_intents', count(*)::int from public.donation_intents
    union all select 'payment_sessions', count(*)::int from public.payment_sessions
    union all select 'payment_events', count(*)::int from public.payment_events
    union all select 'refund_requests', count(*)::int from public.refund_requests
    union all select 'field_tasks', count(*)::int from public.field_tasks
    union all select 'proof_submissions', count(*)::int from public.proof_submissions
    union all select 'donation_fulfillments', count(*)::int from public.donation_fulfillments
    union all select 'donor_reports', count(*)::int from public.donor_reports
    union all select 'payment_ledger_entries', count(*)::int from public.payment_ledger_entries
    union all select 'campaign_financial_totals', count(*)::int from public.campaign_financial_totals
  `);

  console.log("Silinmeden önce satır sayıları:");
  for (const row of countsBefore.rows) {
    console.log(`- ${row.table_name}: ${row.total}`);
  }

  await client.query("begin");
  try {
    await client.query(`truncate table ${TRUNCATE_TABLES.join(", ")} restart identity cascade;`);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  const countsAfter = await client.query(`
    select
      'campaigns' as table_name, count(*)::int as total from public.campaigns
    union all select 'donations', count(*)::int from public.donations
    union all select 'donation_intents', count(*)::int from public.donation_intents
    union all select 'payment_sessions', count(*)::int from public.payment_sessions
    union all select 'payment_events', count(*)::int from public.payment_events
    union all select 'refund_requests', count(*)::int from public.refund_requests
    union all select 'field_tasks', count(*)::int from public.field_tasks
    union all select 'proof_submissions', count(*)::int from public.proof_submissions
    union all select 'donation_fulfillments', count(*)::int from public.donation_fulfillments
    union all select 'donor_reports', count(*)::int from public.donor_reports
    union all select 'payment_ledger_entries', count(*)::int from public.payment_ledger_entries
    union all select 'campaign_financial_totals', count(*)::int from public.campaign_financial_totals
  `);

  console.log("Silindikten sonra satır sayıları:");
  for (const row of countsAfter.rows) {
    console.log(`- ${row.table_name}: ${row.total}`);
  }

  await client.end();
}

main().catch((error) => {
  console.error("Bağış alanı verisi temizlenemedi:", error);
  process.exit(1);
});
