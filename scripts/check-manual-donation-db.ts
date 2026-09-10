import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { recordManualDonation } from "../lib/donations/manual-record";
import { parseManualDonation } from "../lib/donations/manual-validation";

// Deliberately no app environment: this test can only connect to the isolated loopback fixture.
const pool = new Pool({host:"127.0.0.1",port:55439,user:"postgres",database:"mizan_phase2_test"});
try {
  assert.equal((await pool.query("select current_database() as name")).rows[0].name,"mizan_phase2_test");
  // Install the production confirmation function without cron scheduling/reconciliation side effects.
  const confirmation = await readFile("supabase/migrations/20260730124816_reconcile_paid_donation_confirmation.sql","utf8");
  await pool.query(confirmation.slice(0,confirmation.indexOf("create or replace function private.reconcile_paid_donation_confirmations()")) + "commit;");
  const actor = {id:Number((await pool.query("insert into public.users(name,email,role) values ('Test admin',$1,'admin') returning id",[`test-${randomUUID()}@example.invalid`])).rows[0].id),email:"test@example.invalid"};
  async function campaign(stock=12, model="fixed") {
    const code = randomUUID();
    return Number((await pool.query(`insert into public.campaigns(code,slug,target_amount,status,pricing_model,unit_price,unit_label,total_stock,video_delivery,operation_type,group_capacity,participant_required,message_template)
      values ($1,$1,100000,'active',$2,2000,'hisse',$3,'video','standard_video',case when $3::integer < 6 then $3::integer else 6 end,true,'Test {{link}}') returning id`,[code,model,model === "fixed" ? stock : null])).rows[0].id);
  }
  function input(campaignId:number, overrides:Record<string,string>={}) {
    const form = new FormData();
    for(const [key,value] of Object.entries({requestId:randomUUID(),campaignId:String(campaignId),currency:"TRY",quantity:"3",donorName:"Test Bağışçı",phone:"05551234567",country:"TR",date:"2026-09-08",expectedAmount:"6000",receivedAmount:"6000",contactConsent:"on",...overrides})) form.set(key,value);
    return parseManualDonation(form,new Date("2026-09-09T12:00:00Z"));
  }
  async function save(data:ReturnType<typeof input>,failAfter=false) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await recordManualDonation(client,data,actor);
      if(failAfter) throw new Error("Injected transaction failure");
      await client.query("commit"); return result;
    } catch(error) {await client.query("rollback");throw error;} finally {client.release();}
  }
  const id = await campaign();
  const data = input(id);
  const [first,retry] = await Promise.all([save(data),save(data)]);
  assert.equal(first.id,retry.id);
  assert.equal((await pool.query("select count(*)::int as n from public.donations where campaign_id=$1",[id])).rows[0].n,1);
  assert.equal((await pool.query("select confirmed_units from public.campaigns where id=$1",[id])).rows[0].confirmed_units,3);
  assert.equal((await pool.query("select count(*)::int as n from public.operation_group_members where donation_id=$1 and status='confirmed'",[first.id])).rows[0].n,3);
  assert.equal((await pool.query("select count(*)::int as n from public.payment_ledger_entries where donation_id=$1",[first.id])).rows[0].n,1);
  await assert.rejects(save({...data,note:"changed"}),/farklı bilgiler/);
  await assert.rejects(save(input(id,{receivedAmount:"5500"})),/500.00 TRY eksik/);
  await assert.rejects(save(input(id,{expectedAmount:"5500",receivedAmount:"5500"})),/fiyatı değişti/);
  await assert.rejects(save(input(id,{currency:"USD"})),/para birimi/);
  await assert.rejects(save(input(id,{receivedAmount:"6500"})),/Fazla ödeme/);
  const excess = await save(input(id,{receivedAmount:"6500",excessConfirmed:"on"}));
  assert.equal(Number((await pool.query("select net_confirmed_amount from public.donations where id=$1",[excess.id])).rows[0].net_confirmed_amount),6500);
  const beforeRollback = (await pool.query("select count(*)::int as n from public.donations")).rows[0].n;
  await assert.rejects(save(input(id),true),/Injected/);
  assert.equal((await pool.query("select count(*)::int as n from public.donations")).rows[0].n,beforeRollback);
  assert.equal((await pool.query("select confirmed_units from public.campaigns where id=$1",[id])).rows[0].confirmed_units,6);
  const scarce = await campaign(3);
  const race = await Promise.allSettled([save(input(scarce)),save(input(scarce))]);
  assert.equal(race.filter(x=>x.status === "fulfilled").length,1);
  assert.equal((await pool.query("select confirmed_units from public.campaigns where id=$1",[scarce])).rows[0].confirmed_units,3);
  const free = await campaign(0,"free");
  await save(input(free,{quantity:"1",expectedAmount:"1250",receivedAmount:"1250"}));
  assert.equal(Number((await pool.query("select collected_amount from public.campaigns where id=$1",[free])).rows[0].collected_amount),1250);
  console.log("PASS: real PostgreSQL atomic records, participant/group assignment, ledger, concurrent idempotency, payload mismatch, stock race, rollback, underpayment, surplus consent, currency/price changes, free donation.");
} finally { await pool.end(); }
