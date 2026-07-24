import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { getQurbaniVideoLimits, getQurbaniVideoStorage } from "@/lib/qurbani/storage";
import { verifyQurbaniUploadGrant } from "@/lib/qurbani/upload-auth";

type TusHook = {
  Type?: string;
  Event?: {
    Upload?: {
      ID?: string;
      Size?: number;
      MetaData?: Record<string, string>;
      Storage?: Record<string, string>;
    };
  };
};

const allowedMime = new Set(["video/mp4", "video/quicktime"]);

function stop(message: string, statusCode = 400) {
  return NextResponse.json({ StopUpload: true, HTTPResponse: { StatusCode: statusCode, Body: message } });
}

export async function POST(request: Request) {
  const hook = await request.json().catch(() => null) as TusHook | null;
  const upload = hook?.Event?.Upload;
  const metadata = upload?.MetaData || {};
  const grant = verifyQurbaniUploadGrant(String(metadata.grant || ""));
  if (!hook?.Type || !upload || !grant) return stop("Gecersiz veya suresi dolmus upload yetkisi.", 403);

  const payload = await getPayloadClient();
  const video = await payload.findByID({ collection: "qurbani-videos", id: grant.videoId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!video || String(video.pool) !== grant.poolId || String(video.fieldTask) !== grant.fieldTaskId) {
    return stop("Upload kaydi gorevle eslesmiyor.", 403);
  }

  // tusd can retry a post-finish hook after the application has already
  // moved the file and queued the worker. Treat the same finished upload as
  // a successful idempotent operation rather than rejecting it.
  if (hook.Type === "post-finish" && video.status === "uploaded" && String(upload.ID || "") === video.uploadId) {
    return NextResponse.json({ StopUpload: false });
  }

  if (video.status !== "uploading") return stop("Upload kaydi gorevle eslesmiyor.", 403);

  if (hook.Type === "pre-create") {
    const size = Number(upload.Size || 0);
    const mime = String(metadata.mimeType || video.mimeType || "");
    if (!allowedMime.has(mime) || size <= 0 || size > getQurbaniVideoLimits().maxBytes || size !== Number(video.sizeBytes)) return stop("Video tipi veya boyutu kabul edilmiyor.");
    return NextResponse.json({ StopUpload: false, ChangeFileInfo: { ID: video.uploadId, MetaData: { ...metadata, grant: metadata.grant } } });
  }

  if (hook.Type === "post-finish") {
    if (String(upload.ID || "") !== video.uploadId) return stop("Upload kimligi eslesmiyor.", 403);
    const storage = getQurbaniVideoStorage();
    await storage.ensureDirectories();
    const rawKey = video.rawStorageKey;
    if (!(await storage.exists("raw", rawKey))) {
      await storage.move("uploads", video.uploadId, "raw", rawKey);
    }
    await storage.remove("uploads", `${video.uploadId}.info`);
    await payload.update({ collection: "qurbani-videos", id: video.id, data: { status: "uploaded" }, overrideAccess: true });
    const idempotencyKey = `process-video:${video.id}`;
    const existing = await payload.find({
      collection: "qurbani-jobs",
      where: { idempotencyKey: { equals: idempotencyKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (!existing.docs[0]) {
      try {
        await payload.create({ collection: "qurbani-jobs", data: { type: "process_video", status: "queued", video: video.id, pool: grant.poolId, runAt: new Date().toISOString(), idempotencyKey, payload: { uploadId: video.uploadId } }, overrideAccess: true });
      } catch (error) {
        // A concurrent retry may have inserted the unique idempotency key.
        // Only swallow the error when the durable job can subsequently be read.
        const createdByRetry = await payload.find({
          collection: "qurbani-jobs",
          where: { idempotencyKey: { equals: idempotencyKey } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        if (!createdByRetry.docs[0]) throw error;
      }
    }
    return NextResponse.json({ StopUpload: false });
  }

  return NextResponse.json({ StopUpload: false });
}
