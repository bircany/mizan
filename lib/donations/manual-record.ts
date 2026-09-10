import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { amountFromCents, compareManualPayment, ManualDonationError, type ManualDonationInput } from "./manual-validation";

export async function recordManualDonation(client: PoolClient, input: ManualDonationInput, actor: {id: string | number; email: string}) {
  const reference = `MANUAL-${actor.id}-${input.requestId}`;
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  // Serialize retries of this request before touching campaign stock. Unique payment IDs are the second guard.
  await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [reference]);
  const previous = await client.query(`select d.id, d.receipt_number, s.raw_response from public.donations d join public.payment_sessions s on s.id=d.payment_session_id where d.payment_id=$1`, [reference]);
  if (previous.rows[0]) {
    if (previous.rows[0].raw_response?.manualFingerprint !== fingerprint) throw new ManualDonationError("Bu kayıt kimliği daha önce farklı bilgilerle kullanıldı. Yeni bağış için formu yeniden açın.");
    return { id: Number(previous.rows[0].id), receipt: String(previous.rows[0].receipt_number), duplicate: true };
  }
  const campaign = (await client.query(`select id, status, pricing_model, unit_price, currency, video_delivery, operation_type, total_stock, reserved_units, confirmed_units, is_donation_open from public.campaigns where id=$1 for update`, [input.campaignId])).rows[0];
  if (!campaign || campaign.status !== "active" || campaign.is_donation_open === false) throw new ManualDonationError("Kampanya bağışa açık değil.");
  const expected = compareManualPayment(input, campaign);
  if (campaign.total_stock !== null && Number(campaign.reserved_units) + Number(campaign.confirmed_units) + input.quantity > Number(campaign.total_stock)) throw new ManualDonationError("Kampanyada yeterli hisse/adet kalmadı.");
  const expires = new Date(Date.now() + 15 * 60_000).toISOString();
  const amount = amountFromCents(expected);
  const received = amountFromCents(input.receivedCents);
  // No email was collected. Empty existing NOT NULL field means absent; never invent an address or send email.
  const intentId = Number((await client.query(`insert into public.donation_intents
    (conversation_id,donor_name,email,phone,campaign_id,quantity,unit_price_snapshot,amount,currency,payment_method,reservation_expires_at,note,tax_receipt_requested,source,status)
    values ($1,$2,'',$3,$4,$5,$6,$7,$8,'bank_transfer',$9,$10,false,'admin_manual','draft') returning id`,
    [reference,input.donorName,input.phone,input.campaignId,input.quantity,campaign.pricing_model === "fixed" ? campaign.unit_price : null,amount,campaign.currency,expires,input.note])).rows[0].id);
  const participants = await client.query(`insert into public.donation_participants
    (donation_intent_id,order_index,name,phone,effective_phone,is_payer,contact_consent,proxy_consent)
    select $1, x.ordinality, x.name, x.phone, x.phone, x.name=$4 and x.phone=$5, $6, $7
    from unnest($2::text[], $3::text[]) with ordinality as x(name,phone,ordinality) returning id`,
    [intentId,input.participants.map(p=>p.name),input.participants.map(p=>p.phone),input.donorName,input.whatsapp,input.contactConsent,input.proxyConsent]);
  await client.query("select private.reserve_unified_donation($1::jsonb)", [JSON.stringify({intentId,campaignId:input.campaignId,quantity:input.quantity,reservationExpiresAt:expires,participantIds:participants.rows.map(row=>row.id)})]);
  const metadata = {manualFingerprint:fingerprint,actorId:String(actor.id),paymentDate:input.date,expectedAmount:amount,receivedAmount:received,excessAmount:amountFromCents(input.receivedCents-expected),excessConfirmed:input.excessConfirmed,whatsapp:input.whatsapp};
  const sessionId = Number((await client.query(`insert into public.payment_sessions
    (donation_intent_id,conversation_id,payment_method,provider_status,payment_id,eft_review_status,eft_reviewed_at,eft_reviewed_by_id,raw_response)
    values ($1,$2,'bank_transfer','MANUAL_APPROVED',$2,'approved',now(),$3,$4::jsonb) returning id`, [intentId,reference,actor.id,JSON.stringify(metadata)])).rows[0].id);
  const receipt = `MIZ-IBAN-${input.requestId.toUpperCase()}`;
  const donationId = Number((await client.query(`insert into public.donations
    (donation_intent_id,donor_name,email,phone,campaign_id,quantity,unit_price_snapshot,gross_amount,net_confirmed_amount,currency,payment_method,confirmed_at,status,payment_id,receipt_number,payment_session_id,tax_receipt_requested,donation_note)
    values ($1,$2,'',$3,$4,$5,$6,$7,$7,$8,'bank_transfer',$9,'paid',$10,$11,$12,false,$13) returning id`,
    [intentId,input.donorName,input.phone,input.campaignId,input.quantity,campaign.pricing_model === "fixed" ? campaign.unit_price : null,received,campaign.currency,`${input.date}T12:00:00+03:00`,reference,receipt,sessionId,input.note])).rows[0].id);
  await client.query("select private.confirm_unified_donation($1,$2,$3)", [intentId,donationId,actor.email]);
  await client.query("select public.record_payment_ledger_entry($1,$2,null,'capture',$3,$4,$5,$6,false,$7::jsonb)", [donationId,input.campaignId,received,campaign.currency,reference,`capture:${reference}`,JSON.stringify({...metadata,paymentMethod:"bank_transfer",source:"admin_manual"})]);
  await client.query(`update public.campaigns set status='closed',is_donation_open=false,updated_at=now() where id=$1 and pricing_model='free' and target_amount is not null and collected_amount>=target_amount`, [input.campaignId]);
  await client.query(`insert into public.audit_logs(action,actor_email,target_collection,target_id,details) values ('donation.manual_recorded',$1,'donations',$2,$3::jsonb)`, [actor.email,String(donationId),JSON.stringify({sessionId,intentId,...metadata})]);
  return {id:donationId,receipt,duplicate:false};
}
