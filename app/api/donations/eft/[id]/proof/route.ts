import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyEftUploadToken } from "@/lib/donations/eft-authorization";
import { validateManualProof } from "@/lib/donations/manual-proof";
import { ManualDonationError } from "@/lib/donations/manual-validation";
import { withDatabaseTransaction } from "@/lib/database";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const intentId = Number((await context.params).id);
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const claims = Number.isSafeInteger(intentId) && intentId > 0 && token ? verifyEftUploadToken(token, intentId) : null;
    if (!claims) return NextResponse.json({ success: false, error: "Dekont bağlantısı geçersiz veya süresi dolmuş." }, { status: 403 });
    await enforceRateLimit({ scope: "eft-proof", identity: String(intentId), maxRequests: 10, windowSeconds: 60 });
    const reader = request.body?.getReader();
    if (!reader) throw new ManualDonationError("Dosya gerekli.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > 11 * 1024 * 1024) {
        await reader.cancel();
        return NextResponse.json({ error: "İstek en fazla 11 MB olabilir." }, { status: 413 });
      }
      chunks.push(chunk.value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") || "" } }).formData();
    const proof = await validateManualProof(form.get("file"));
    const storage = getSupabaseServiceClient();
    const bucket = "eft-proofs";
    const info = await storage.storage.getBucket(bucket);
    if (info.error || !info.data || info.data.public) throw new ManualDonationError("Özel dekont depolaması hazır değil.");
    const path = `${intentId}/${randomUUID()}.${proof.extension}`;
    // Serialize concurrent/replayed claims and change both references atomically.
    await withDatabaseTransaction(async client => {
      const session = (await client.query(`select * from public.payment_sessions where id=$1 for update`, [claims.sessionId])).rows[0];
      if (!session || Number(session.donation_intent_id) !== intentId || session.payment_method !== "bank_transfer" || session.provider_status !== "EFT_PROOF_PENDING" || !session.reservation_expires_at || new Date(session.reservation_expires_at).getTime() <= Date.now()) throw new ManualDonationError("Bu EFT rezervasyonu artık dekont kabul etmiyor.");
      const upload = await storage.storage.from(bucket).upload(path, proof.bytes, { contentType: proof.mime, upsert: false });
      if (upload.error) throw new ManualDonationError("Dekont depolanamadı.");
      // Keep private objects on uncertain commits: deletion could break a committed reference.
      await client.query(`update public.payment_sessions set eft_proof_bucket=$1,eft_proof_path=$2,eft_review_status='pending',provider_status='EFT_REVIEW_PENDING',updated_at=now() where id=$3`, [bucket, path, claims.sessionId]);
      await client.query(`update public.donation_intents set status='bank_transfer_submitted',updated_at=now() where id=$1`, [intentId]);
    });
    return NextResponse.json({ success: true, status: "pending_review" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof ManualDonationError || error instanceof RateLimitError ? error.message : "Dekont yüklenemedi. Lütfen tekrar deneyin." }, { status: error instanceof RateLimitError ? error.status : 400 });
  }
}
