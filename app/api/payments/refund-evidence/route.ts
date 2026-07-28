import crypto from "crypto";
import { NextResponse } from "next/server";

import { canManageFinance } from "@/lib/auth/roles";
import { getAdminSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

function detectMimeType(bytes: Uint8Array) {
  if (
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
  ) {
    return "application/pdf";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    )
  ) {
    return "image/png";
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user || !canManageFinance(user.role)) {
    return NextResponse.json(
      { success: false, error: "Yetkisiz istek." },
      { status: 403 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const donationId = String(form.get("donationId") || "").trim();
    if (!donationId) throw new Error("Bağış kaydı zorunludur.");
    if (
      !(file instanceof File) ||
      file.size <= 0 ||
      file.size > MAX_BYTES ||
      !EXTENSIONS[file.type]
    ) {
      throw new Error("Kanıt PDF, JPG veya PNG ve en fazla 10 MB olmalıdır.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectMimeType(bytes);
    if (!mimeType || mimeType !== file.type) {
      throw new Error("Dosyanın gerçek tipi yükleme bilgisiyle eşleşmiyor.");
    }

    const bucket = "refund-evidence";
    const path = `${donationId}/${Date.now()}-${crypto.randomUUID()}.${EXTENSIONS[mimeType]}`;
    const { error } = await getSupabaseServiceClient().storage
      .from(bucket)
      .upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      });
    if (error) throw new Error(`Kanıt yüklenemedi: ${error.message}`);

    return NextResponse.json({
      success: true,
      evidenceBucket: bucket,
      evidencePath: path,
      evidenceMimeType: mimeType,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Kanıt yüklenemedi.",
      },
      { status: 400 },
    );
  }
}
