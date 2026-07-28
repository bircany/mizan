import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import {
  DELIVERY_UPLOAD_ALLOWED_MIME,
  type DeliveryUploadMime,
  type DeliveryUploadRole,
} from "@/lib/delivery/upload-auth";
import { reserveDeliveryUploadSession } from "@/lib/delivery/group-code-upload-session";
import {
  getDeliveryVideoLimits,
  getTusdConfiguration,
} from "@/lib/delivery/storage";

export const dynamic = "force-dynamic";

const allowedMime = new Set<string>(DELIVERY_UPLOAD_ALLOWED_MIME);

function inferMime(fileName: string, requestedMime: string) {
  if (allowedMime.has(requestedMime)) return requestedMime as DeliveryUploadMime;
  if (/\.mov$/i.test(fileName)) return "video/quicktime" as const;
  if (/\.mp4$/i.test(fileName)) return "video/mp4" as const;
  if (/\.webm$/i.test(fileName)) return "video/webm" as const;
  return null;
}

function requestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function json(
  body: Record<string, unknown>,
  status = 200,
  retryAfterSeconds?: number,
) {
  const headers = new Headers({ "cache-control": "private, no-store" });
  if (retryAfterSeconds) headers.set("retry-after", String(retryAfterSeconds));
  return NextResponse.json(body, { status, headers });
}

export async function POST(request: Request) {
  const user = await getAdminSession();
  const role = String(user?.role || "") as DeliveryUploadRole;
  if (!user?.id || !["admin", "field_operator"].includes(role)) {
    return json({ ok: false, error: "Video yükleme yetkiniz yok." }, 403);
  }

  try {
    const body = await request.json() as {
      groupId?: unknown;
      groupCode?: unknown;
      fileName?: unknown;
      mimeType?: unknown;
      sizeBytes?: unknown;
    };
    const groupId = Number(body.groupId);
    const repeatedGroupCode =
      typeof body.groupCode === "string" ? body.groupCode.trim() : "";
    const fileName =
      typeof body.fileName === "string" ? body.fileName.trim().slice(0, 180) : "";
    const requestedMime =
      typeof body.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
    const mimeType = inferMime(fileName, requestedMime);
    const sizeBytes = Number(body.sizeBytes);
    const { maxBytes } = getDeliveryVideoLimits();

    if (
      !Number.isInteger(groupId) ||
      groupId <= 0 ||
      !repeatedGroupCode ||
      !fileName ||
      /[\\/\u0000-\u001f\u007f]/.test(fileName) ||
      !mimeType ||
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > maxBytes
    ) {
      return json({
        ok: false,
        error:
          "Grup kodu ile MP4, MOV veya WebM biçiminde en fazla 2 GB video zorunludur.",
      }, 400);
    }

    const reservation = await reserveDeliveryUploadSession({
      groupId,
      repeatedGroupCode,
      fileName,
      mimeType,
      sizeBytes,
      maxBytes,
      user: {
        id: String(user.id),
        email: typeof user.email === "string" ? user.email : null,
        role,
      },
      ipAddress: requestIp(request),
    });
    if (!reservation.ok) {
      return json(
        { ok: false, error: reservation.error },
        reservation.status,
        reservation.retryAfterSeconds,
      );
    }

    return json({
      ok: true,
      videoId: reservation.videoId,
      uploadId: reservation.uploadId,
      version: reservation.version,
      tokenExpiresAt: reservation.expiresAt,
      endpoint: `${getTusdConfiguration().endpoint}/`,
      metadata: {
        token: reservation.grant,
      },
      limits: {
        maxBytes,
        maxSeconds: getDeliveryVideoLimits().maxSeconds,
        allowedMime: DELIVERY_UPLOAD_ALLOWED_MIME,
      },
    });
  } catch (error) {
    console.error("Delivery upload session could not be created.", error);
    return json({
      ok: false,
      error: "Video yükleme oturumu şu anda oluşturulamıyor.",
    }, 500);
  }
}
