"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/session";
import { databaseQuery, withDatabaseTransaction } from "@/lib/database";
import { recordManualDonation } from "@/lib/donations/manual-record";
import { ManualDonationError, parseManualDonation } from "@/lib/donations/manual-validation";
import { normalizeInternationalPhone } from "@/lib/phone";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateManualProof } from "@/lib/donations/manual-proof";

async function adminFor(scope: string, maxRequests: number) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin") throw new ManualDonationError("Bu işlem yalnızca admin tarafından yapılabilir.");
  await enforceRateLimit({scope, identity:String(user.id), maxRequests, windowSeconds:60});
  return user;
}
function safeError(error: unknown) {
  return error instanceof ManualDonationError || error instanceof RateLimitError ? error.message : "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function saveManualDonation(form: FormData) {
  try {
    const user = await adminFor("manual-donation-save", 20);
    const input = parseManualDonation(form);
    const result = await withDatabaseTransaction(client => recordManualDonation(client,input,{id:user.id,email:String(user.email)}));
    // A refresh/cache failure must never turn an already committed payment into a reported failure.
    try { revalidatePath("/panel/bagis-yonetimi"); revalidatePath("/panel/video-teslimat"); revalidatePath("/bagis"); } catch { /* next render reads committed data */ }
    return {success:true as const,...result,message:result.duplicate ? "Bu bağış zaten kaydedilmiş; tekrar oluşturulmadı." : "IBAN bağışı kaydedildi."};
  } catch (error) { return {success:false as const,message:safeError(error)}; }
}

export async function findManualDonor(rawPhone: string, country: string) {
  try {
    await adminFor("manual-donor-lookup", 30);
    let normalized: string;
    try { normalized = normalizeInternationalPhone(rawPhone,country); }
    catch { return {success:false as const,message:"Geçerli bir telefon numarası girin."}; }
    const variants = [normalized, normalized.slice(1)];
    if (normalized.startsWith("+90")) variants.push(`0${normalized.slice(3)}`,normalized.slice(3));
    const result = await databaseQuery<{donor_name:string}>(`select donor_name from public.donations where phone=any($1::text[]) and status in ('paid','partially_refunded') order by created_at desc,id desc limit 1`, [variants]);
    return {success:true as const,name:result.rows[0]?.donor_name || null,phone:normalized};
  } catch(error) { return {success:false as const,message:safeError(error)}; }
}

export async function attachManualProof(form: FormData) {
  try {
    const user = await adminFor("manual-donation-proof", 10);
    const donationId = Number(form.get("donationId"));
    if (!Number.isSafeInteger(donationId) || donationId < 1) throw new ManualDonationError("Bağış kimliği geçersiz.");
    const donation = (await databaseQuery<{session_id:number}>(`select d.payment_session_id as session_id from public.donations d join public.donation_intents i on i.id=d.donation_intent_id where d.id=$1 and i.source='admin_manual' and d.payment_method='bank_transfer'`,[donationId])).rows[0];
    if (!donation) throw new ManualDonationError("Manuel IBAN bağışı bulunamadı.");
    const proof = await validateManualProof(form.get("file"));
    const storage = getSupabaseServiceClient();
    const bucket = "eft-proofs";
    const bucketInfo = await storage.storage.getBucket(bucket);
    if (bucketInfo.error || !bucketInfo.data || bucketInfo.data.public) throw new ManualDonationError("Özel dekont depolaması hazır değil. Bağış kaydı korunuyor; dekontu daha sonra ekleyin.");
    const path = `manual/${donationId}/${randomUUID()}.${proof.extension}`;
    const uploaded = await storage.storage.from(bucket).upload(path,proof.bytes,{contentType:proof.mime,upsert:false});
    if (uploaded.error) throw new ManualDonationError("Dekont yüklenemedi. Bağış kaydı korunuyor; tekrar deneyin.");
    // Keep original proofs private and immutable. Replacement only updates the active reference.
    await withDatabaseTransaction(async client => {
      const before = (await client.query(`select eft_proof_path from public.payment_sessions where id=$1 for update`,[donation.session_id])).rows[0];
      await client.query(`update public.payment_sessions set eft_proof_bucket=$1,eft_proof_path=$2,updated_at=now() where id=$3`,[bucket,path,donation.session_id]);
      await client.query(`insert into public.audit_logs(action,actor_email,target_collection,target_id,details) values ('donation.manual_proof_attached',$1,'donations',$2,$3::jsonb)`,[user.email,String(donationId),JSON.stringify({sessionId:donation.session_id,path,previousPath:before?.eft_proof_path || null})]);
    });
    revalidatePath("/panel/bagis-yonetimi");
    return {success:true as const,message:"Dekont eklendi."};
  } catch(error) { return {success:false as const,message:safeError(error)}; }
}
