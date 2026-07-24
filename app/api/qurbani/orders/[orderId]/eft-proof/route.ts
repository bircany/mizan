import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { verifyQurbaniOrderAuthorization } from "@/lib/qurbani/order-authorization";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const MAX_BYTES = 10 * 1024 * 1024;
const mimeExtension: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

function realType(bytes: Uint8Array) {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  return null;
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  if (!verifyQurbaniOrderAuthorization(cookieValue(request, "mizan-qurbani-order"), orderId)) {
    return NextResponse.json({ ok: false, error: "Siparis yukleme yetkisi gecersiz veya suresi dolmus." }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX_BYTES || !mimeExtension[file.type]) throw new Error("Dekont PDF, JPG veya PNG ve en fazla 10 MB olmalidir.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = realType(bytes);
    if (!detected || detected !== file.type) throw new Error("Dekontun gercek dosya tipi yukleme bilgisiyle eslesmiyor.");

    const payload = await getPayloadClient();
    const order = await payload.findByID({ collection: "qurbani-orders", id: orderId, depth: 0, overrideAccess: true });
    if (order.paymentMethod !== "eft" || order.status !== "pending_eft_review" || new Date(order.reservedUntil).getTime() <= Date.now()) throw new Error("Bu siparis artik EFT dekontu kabul etmiyor.");
    const bucket = "qurbani-eft-proofs";
    const storagePath = `${order.id}/${crypto.randomUUID()}.${mimeExtension[detected]}`;
    const storage = getSupabaseServiceClient();
    const { error } = await storage.storage.from(bucket).upload(storagePath, bytes, { contentType: detected, upsert: false });
    if (error) throw new Error(`Dekont guvenli depolamaya yuklenemedi: ${error.message}`);
    const previous = order.eftProofPath;
    try {
      await payload.update({ collection: "qurbani-orders", id: order.id, data: { eftProofBucket: bucket, eftProofPath: storagePath, eftProofMimeType: detected }, overrideAccess: true });
    } catch (updateError) {
      await storage.storage.from(bucket).remove([storagePath]);
      throw updateError;
    }
    if (previous && previous !== storagePath) await storage.storage.from(bucket).remove([previous]);
    return NextResponse.json({ ok: true, status: "pending_eft_review" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Dekont yuklenemedi." }, { status: 400 });
  }
}
