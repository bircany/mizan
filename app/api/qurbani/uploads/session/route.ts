import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";
import { createQurbaniUploadGrant } from "@/lib/qurbani/upload-auth";
import { getQurbaniVideoLimits } from "@/lib/qurbani/storage";

const allowedMime = new Set(["video/mp4", "video/quicktime"]);
const relationId = (value: unknown) => typeof value === "object" && value && "id" in value ? String((value as { id: number | string }).id) : String(value || "");

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user?.id || (user.role !== "field_operator" && user.role !== "super_admin")) {
    return NextResponse.json({ ok: false, error: "Video yukleme yetkiniz yok." }, { status: 403 });
  }
  try {
    const body = await request.json() as { poolId?: string; fileName?: string; mimeType?: string; sizeBytes?: number };
    const poolId = String(body.poolId || "");
    const fileName = String(body.fileName || "").trim().slice(0, 180);
    const requestedMime = String(body.mimeType || "");
    const mimeType = requestedMime || (/\.mov$/i.test(fileName) ? "video/quicktime" : /\.mp4$/i.test(fileName) ? "video/mp4" : "");
    const sizeBytes = Number(body.sizeBytes || 0);
    const { maxBytes } = getQurbaniVideoLimits();
    if (!poolId || !fileName || !allowedMime.has(mimeType) || !Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxBytes) {
      throw new Error("MP4/MOV video ve gecerli dosya boyutu zorunludur.");
    }

    const payload = await getPayloadClient();
    const pool = await payload.findByID({ collection: "qurbani-pools", id: poolId, depth: 1, overrideAccess: true });
    const taskId = relationId(pool.fieldTask);
    if (!pool.code || !taskId || !["assigned", "in_progress"].includes(pool.status)) throw new Error("Havuz video yuklemeye hazir degil.");
    const task = typeof pool.fieldTask === "object" && pool.fieldTask ? pool.fieldTask : await payload.findByID({ collection: "field-tasks", id: taskId, depth: 0, overrideAccess: true });
    if (user.role === "field_operator" && relationId(task.assignedTo) !== String(user.id)) throw new Error("Bu kurban gorevi size atanmamis.");

    if (pool.status === "assigned") {
      const startedAt = new Date().toISOString();
      await payload.update({ collection: "qurbani-pools", id: pool.id, data: { status: "in_progress", lockedAt: pool.lockedAt || startedAt }, overrideAccess: true });
      if (task.status === "todo") await payload.update({ collection: "field-tasks", id: taskId, data: { status: "in_progress" }, overrideAccess: true });
    }

    const uploadId = randomUUID();
    const rawStorageKey = `${uploadId}.source`;
    const video = await payload.create({
      collection: "qurbani-videos",
      data: { pool: pool.id, fieldTask: taskId, uploadedBy: user.id, uploadId, rawStorageKey, originalFilename: fileName, mimeType, sizeBytes, status: "uploading" },
      overrideAccess: true,
    });
    const grant = createQurbaniUploadGrant({ videoId: String(video.id), poolId: String(pool.id), fieldTaskId: taskId, userId: String(user.id) });
    return NextResponse.json({
      ok: true,
      videoId: String(video.id),
      uploadId,
      endpoint: process.env.QURBANI_UPLOAD_BASE_URL || "http://localhost:1080/files/",
      metadata: { grant, videoId: String(video.id), uploadId, mimeType },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Video oturumu acilamadi." }, { status: 400 });
  }
}
