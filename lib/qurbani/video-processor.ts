import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";

import type { Payload } from "payload";

import { getQurbaniVideoLimits, getQurbaniVideoStorage } from "@/lib/qurbani/storage";

function relationId(value: unknown) {
  return typeof value === "object" && value && "id" in value ? String((value as { id: number | string }).id) : String(value || "");
}

function run(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} ${code}: ${stderr.slice(-1500)}`)));
  });
}

function safeCode(value: string) {
  return value.replace(/[^A-Z0-9-]/gi, "").slice(0, 32) || "MIZAN";
}

export async function processQurbaniVideo(payload: Payload, videoId: string | number) {
  const storage = getQurbaniVideoStorage();
  await storage.ensureDirectories();
  const video = await payload.findByID({ collection: "qurbani-videos", id: videoId, depth: 1, overrideAccess: true });
  const poolId = relationId(video.pool);
  const pool = typeof video.pool === "object" && video.pool ? video.pool : await payload.findByID({ collection: "qurbani-pools", id: poolId, depth: 0, overrideAccess: true });
  const code = safeCode(String(pool.code || "MIZAN"));
  const rawPath = storage.resolve("raw", video.rawStorageKey);
  const processedKey = `${video.uploadId}.mp4`;
  const coverKey = `${video.uploadId}.jpg`;
  const outputPath = storage.resolve("processed", processedKey);
  const coverPath = storage.resolve("covers", coverKey);
  const { maxSeconds } = getQurbaniVideoLimits();

  await payload.update({ collection: "qurbani-videos", id: video.id, data: { status: "processing", attemptCount: Number(video.attemptCount || 0) + 1, lastError: null }, overrideAccess: true });
  await payload.update({ collection: "qurbani-pools", id: poolId, data: { status: "video_processing" }, overrideAccess: true });

  try {
    const probe = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration,format_name", "-show_entries", "stream=codec_type,codec_name,width,height", "-of", "json", rawPath]);
    const metadata = JSON.parse(probe.stdout) as { format?: { duration?: string; format_name?: string }; streams?: Array<{ codec_type?: string }> };
    const duration = Number(metadata.format?.duration || 0);
    const format = String(metadata.format?.format_name || "");
    if (!metadata.streams?.some((stream) => stream.codec_type === "video") || !Number.isFinite(duration) || duration <= 0 || duration > maxSeconds) {
      throw new Error(`Video dogrulamasi basarisiz veya sure ${maxSeconds} saniyeyi asiyor.`);
    }
    if (!/(mov|mp4|quicktime)/i.test(format)) throw new Error("Gercek dosya formati MP4 veya MOV degil.");

    const overlay = `drawbox=x=24:y=h-132:w=iw-48:h=96:color=black@0.55:t=fill,drawtext=text='MIZAN DERNEGI  ${code}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=h-100`;
    await run("ffmpeg", ["-y", "-i", rawPath, "-vf", `scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,${overlay}`, "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", outputPath]);
    await run("ffmpeg", ["-y", "-ss", String(Math.min(5, Math.max(0, duration / 3))), "-i", outputPath, "-frames:v", "1", "-q:v", "2", coverPath]);

    const now = Date.now();
    const [previousVideos, sentMessages] = await Promise.all([
      payload.find({
        collection: "qurbani-videos",
        where: { and: [{ pool: { equals: poolId } }, { id: { not_equals: video.id } }] },
        sort: "-version",
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "qurbani-messages",
        where: {
          and: [
            { pool: { equals: poolId } },
            { status: { in: ["sent", "delivered", "read"] } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
    ]);
    const previous = previousVideos.docs[0];
    await payload.update({
      collection: "qurbani-videos",
      id: video.id,
      data: {
        status: "ready_to_send",
        version: Number(previous?.version || 0) + 1,
        replacesVideo: previous?.id || undefined,
        readyAt: new Date(now).toISOString(),
        correctionRequired: Boolean(previous && sentMessages.docs[0]),
        durationSeconds: Math.round(duration * 100) / 100,
        processedStorageKey: processedKey,
        thumbnailStorageKey: coverKey,
        rawDeleteAfter: new Date(now + 60 * 86_400_000).toISOString(),
        processedDeleteAfter: new Date(now + 365 * 86_400_000).toISOString(),
        lastError: null,
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: "qurbani-pools",
      id: poolId,
      data: { status: "ready" },
      overrideAccess: true,
    });
    return { duration, processedKey, coverKey };
  } catch (error) {
    await payload.update({ collection: "qurbani-videos", id: video.id, data: { status: "failed", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Video isleme hatasi." }, overrideAccess: true });
    throw error;
  }
}
