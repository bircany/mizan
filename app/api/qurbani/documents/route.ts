import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";
import { removeQurbaniDocument, storeQurbaniDocument } from "@/lib/qurbani/document-storage";

const MAX_BYTES = 25 * 1024 * 1024;
const kinds = new Set(["invoice", "veterinary", "contract", "slaughterhouse", "ear_tag_list", "transport", "other"]);

function detectedMime(bytes: Uint8Array) {
  if (bytes.length >= 5 && new TextDecoder("ascii").decode(bytes.slice(0, 5)) === "%PDF-") return { mime: "application/pdf", extension: "pdf" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 8 && bytes[0] === 0x89 && new TextDecoder("ascii").decode(bytes.slice(1, 4)) === "PNG") return { mime: "image/png", extension: "png" };
  return null;
}

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user?.id || user.role !== "super_admin") return NextResponse.json({ error: "Belge yükleme yetkiniz yok." }, { status: 403 });
  let key = "";
  try {
    const form = await request.formData();
    const file = form.get("file");
    const stockBatchId = String(form.get("stockBatchId") || "");
    const kind = String(form.get("kind") || "other");
    const title = String(form.get("title") || "").trim().slice(0, 160);
    if (!(file instanceof File) || !stockBatchId || !title || !kinds.has(kind)) throw new Error("Parti, belge türü, başlık ve dosya zorunludur.");
    if (file.size < 1 || file.size > MAX_BYTES) throw new Error("Belge en fazla 25 MB olabilir.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectedMime(bytes);
    if (!detected) throw new Error("Yalnız gerçek PDF, JPG veya PNG dosyaları kabul edilir.");
    const payload = await getPayloadClient();
    await payload.findByID({ collection: "qurbani-stock-batches", id: stockBatchId, depth: 0, overrideAccess: true });
    key = `${randomUUID()}.${detected.extension}`;
    await storeQurbaniDocument(key, bytes);
    const record = await payload.create({
      collection: "qurbani-documents",
      overrideAccess: true,
      data: {
        stockBatch: stockBatchId,
        kind,
        title,
        storageKey: key,
        fileName: file.name.slice(0, 180),
        mimeType: detected.mime,
        sizeBytes: bytes.byteLength,
        isPublic: form.get("isPublic") === "true" || form.get("isPublic") === "on",
        status: "active",
        notes: String(form.get("notes") || "").trim().slice(0, 1000) || undefined,
      } as never,
    });
    return NextResponse.json({ success: true, id: String(record.id) });
  } catch (error) {
    if (key) await removeQurbaniDocument(key).catch(() => undefined);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Belge yüklenemedi." }, { status: 400 });
  }
}
