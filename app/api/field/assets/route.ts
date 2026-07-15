import { NextResponse } from "next/server";

import { logAuditEvent } from "@/lib/audit";
import { getAdminSession } from "@/lib/auth/session";
import { getAssignedFieldTask, relationId, type StaffActor } from "@/lib/field-workflow";
import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const MAX_FILE_SIZE_BYTES = 524_288_000;
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);

function getRequestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
}

function assetKind(mimeType: string) {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

function safeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-");
  return normalized.replace(/-+/g, "-").replace(/^-|-$|^$/g, "dosya").slice(0, 120);
}

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user?.id || !user.role || (user.role !== "field_operator" && user.role !== "super_admin")) {
    return NextResponse.json({ success: false, error: "Bu kanıtı yükleme yetkiniz yok." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const submissionId = formData.get("submissionId");
    const file = formData.get("file");
    const caption = formData.get("caption");
    if ((typeof submissionId !== "string" && typeof submissionId !== "number") || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Kanıt gönderimi ve dosya zorunludur." }, { status: 400 });
    }
    if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ success: false, error: "Bu dosya türü kanıt yüklemesi için desteklenmiyor." }, { status: 400 });
    if (!file.size || file.size > MAX_FILE_SIZE_BYTES) return NextResponse.json({ success: false, error: "Dosya boyutu 500 MB sınırını aşamaz." }, { status: 400 });

    const payload = await getPayloadClient();
    const submission = await payload.findByID({ collection: "proof-submissions", id: submissionId, depth: 1, overrideAccess: true });
    const taskId = relationId(submission.fieldTask);
    if (!taskId) throw new Error("Kanıt gönderiminin saha görevi bulunamadı.");
    await getAssignedFieldTask(payload, user as unknown as StaffActor, taskId);
    if (submission.status !== "draft" && submission.status !== "rejected") return NextResponse.json({ success: false, error: "Bu gönderime bu aşamada dosya eklenemez." }, { status: 400 });

    const path = `submissions/${submission.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const storage = getSupabaseServiceClient();
    const { error: uploadError } = await storage.storage.from("proof-assets").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error("Kanıt dosyası güvenli depolamaya yüklenemedi.");

    try {
      const asset = await payload.create({
        collection: "proof-assets",
        data: { submission: submission.id, kind: assetKind(file.type), storagePath: path, fileName: file.name, mimeType: file.type, size: file.size, caption: typeof caption === "string" ? caption.trim() || undefined : undefined, uploadedBy: user.id },
        overrideAccess: true,
      });
      await logAuditEvent(payload, { action: "proof_asset.uploaded", actorEmail: user.email, targetCollection: "proof-assets", targetId: asset.id, details: { submissionId: submission.id, mimeType: file.type, size: file.size, storagePath: path }, ipAddress: getRequestIp(request) });
      return NextResponse.json({ success: true, asset }, { status: 201 });
    } catch (error) {
      await storage.storage.from("proof-assets").remove([path]);
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Kanıt dosyası yüklenemedi." }, { status: 400 });
  }
}
