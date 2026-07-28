import crypto from "crypto";
import { NextResponse } from "next/server";

import { verifyEftUploadToken } from "@/lib/donations/eft-authorization";
import { getPayloadClient } from "@/lib/payload";
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const intentId = Number((await context.params).id);
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const claims =
      Number.isInteger(intentId) && token
        ? verifyEftUploadToken(token, intentId)
        : null;
    if (!claims) {
      return NextResponse.json(
        { success: false, error: "Dekont yükleme bağlantısı geçersiz veya süresi dolmuş." },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size <= 0 ||
      file.size > MAX_BYTES ||
      !EXTENSIONS[file.type]
    ) {
      throw new Error("Dekont PDF, JPG veya PNG ve en fazla 10 MB olmalıdır.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectMimeType(bytes);
    if (!detected || detected !== file.type) {
      throw new Error("Dosyanın gerçek tipi yükleme bilgisiyle eşleşmiyor.");
    }

    const payload = await getPayloadClient();
    const session = await payload.findByID({
      collection: "payment-sessions",
      id: claims.sessionId,
      depth: 0,
      overrideAccess: true,
    });
    const linkedIntent =
      typeof session.donationIntent === "object"
        ? session.donationIntent.id
        : session.donationIntent;
    if (
      Number(linkedIntent) !== intentId ||
      session.paymentMethod !== "bank_transfer" ||
      session.providerStatus !== "EFT_PROOF_PENDING" ||
      !session.reservationExpiresAt ||
      new Date(session.reservationExpiresAt).getTime() <= Date.now()
    ) {
      throw new Error("Bu EFT rezervasyonu artık dekont kabul etmiyor.");
    }

    const bucket = "eft-proofs";
    const storagePath = `${intentId}/${crypto.randomUUID()}.${EXTENSIONS[detected]}`;
    const storage = getSupabaseServiceClient();
    const { error: uploadError } = await storage.storage
      .from(bucket)
      .upload(storagePath, bytes, {
        contentType: detected,
        upsert: false,
      });
    if (uploadError) {
      throw new Error(`Dekont güvenli depolamaya yüklenemedi: ${uploadError.message}`);
    }

    const previous = session.eftProofPath;
    try {
      await payload.update({
        collection: "payment-sessions",
        id: session.id,
        overrideAccess: true,
        data: {
          eftProofBucket: bucket,
          eftProofPath: storagePath,
          eftReviewStatus: "pending",
          providerStatus: "EFT_REVIEW_PENDING",
        },
      });
      await payload.update({
        collection: "donation-intents",
        id: intentId,
        overrideAccess: true,
        data: { status: "bank_transfer_submitted" },
      });
    } catch (error) {
      await storage.storage.from(bucket).remove([storagePath]);
      throw error;
    }
    if (previous && previous !== storagePath) {
      await storage.storage.from(bucket).remove([previous]);
    }

    return NextResponse.json({
      success: true,
      status: "pending_review",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Dekont yüklenemedi.",
      },
      { status: 400 },
    );
  }
}
