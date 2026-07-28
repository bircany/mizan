import "server-only";

import { spawn } from "node:child_process";

import type { Payload } from "payload";

import { prepareDeliveryDrafts } from "@/lib/delivery/messages";
import { getDeliveryVideoLimits, getDeliveryVideoStorage } from "@/lib/delivery/storage";
import { relationId } from "@/lib/delivery/types";

type AnyDoc = Record<string, any> & { id: string | number };
type DeliveryPayload = {
  find(args: Record<string, unknown>): Promise<{ docs: AnyDoc[] }>;
  findByID(args: Record<string, unknown>): Promise<AnyDoc>;
  update(args: Record<string, unknown>): Promise<AnyDoc>;
};
const cms = (payload: Payload) => payload as unknown as DeliveryPayload;

function run(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${code}: ${stderr.slice(-1500)}`));
    });
  });
}

function safeCode(value: unknown) {
  return String(value || "MIZAN").replace(/[^A-Z0-9-]/gi, "").slice(0, 32) || "MIZAN";
}

export async function processDeliveryVideo(payload: Payload, videoId: string | number) {
  const api = cms(payload);
  const storage = getDeliveryVideoStorage();
  await storage.ensureDirectories();
  const video = await api.findByID({
    collection: "operation-videos",
    id: videoId,
    depth: 1,
    overrideAccess: true,
  });
  const groupId = relationId(video.group);
  const group =
    typeof video.group === "object" && video.group
      ? video.group
      : await api.findByID({
          collection: "operation-groups",
          id: groupId,
          depth: 0,
          overrideAccess: true,
        });
  const rawPath = storage.resolve("raw", String(video.rawStorageKey));
  const processedKey = `${video.uploadId}.mp4`;
  const thumbnailKey = `${video.uploadId}.jpg`;
  const outputPath = storage.resolve("processed", processedKey);
  const thumbnailPath = storage.resolve("covers", thumbnailKey);
  const { maxSeconds } = getDeliveryVideoLimits();

  await api.update({
    collection: "operation-videos",
    id: video.id,
    data: { status: "processing", lastError: null },
    overrideAccess: true,
  });

  try {
    const probe = await run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration,format_name",
      "-show_entries", "stream=codec_type",
      "-of", "json",
      rawPath,
    ]);
    const metadata = JSON.parse(probe.stdout) as {
      format?: { duration?: string; format_name?: string };
      streams?: Array<{ codec_type?: string }>;
    };
    const duration = Number(metadata.format?.duration || 0);
    const format = String(metadata.format?.format_name || "");
    if (
      !metadata.streams?.some((stream) => stream.codec_type === "video") ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > maxSeconds
    ) throw new Error(`Video geçersiz veya ${maxSeconds} saniyelik sınırı aşıyor.`);
    if (!/(mov|mp4|quicktime)/i.test(format)) throw new Error("Yalnızca gerçek MP4 veya MOV video kabul edilir.");

    const code = safeCode(group.code);
    const overlay =
      `drawbox=x=24:y=h-132:w=iw-48:h=96:color=black@0.55:t=fill,` +
      `drawtext=text='MIZAN DERNEGI  ${code}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=h-100`;
    await run("ffmpeg", [
      "-y", "-i", rawPath,
      "-vf", `scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,${overlay}`,
      "-c:v", "libx264", "-preset", "medium", "-crf", "22",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
      outputPath,
    ]);
    await run("ffmpeg", [
      "-y", "-ss", String(Math.min(5, Math.max(0, duration / 3))),
      "-i", outputPath, "-frames:v", "1", "-q:v", "2", thumbnailPath,
    ]);

    const [previousVideos, sentMessages] = await Promise.all([
      api.find({
        collection: "operation-videos",
        where: { and: [{ group: { equals: groupId } }, { id: { not_equals: video.id } }] },
        sort: "-version",
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
      api.find({
        collection: "delivery-messages",
        where: {
          and: [
            { group: { equals: groupId } },
            { status: { in: ["sent", "delivered", "read"] } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
    ]);
    const previous = previousVideos.docs[0];
    const now = Date.now();
    await api.update({
      collection: "operation-videos",
      id: video.id,
      data: {
        status: "ready",
        version: Number(previous?.version || 0) + 1,
        replacesVideo: previous?.id || undefined,
        readyAt: new Date(now).toISOString(),
        durationSeconds: Math.round(duration * 100) / 100,
        processedStorageKey: processedKey,
        thumbnailStorageKey: thumbnailKey,
        rawDeleteAfter: new Date(now + 7 * 86_400_000).toISOString(),
        processedDeleteAfter: new Date(now + 365 * 86_400_000).toISOString(),
        lastError: null,
      },
      overrideAccess: true,
    });
    if (previous) {
      await api.update({
        collection: "operation-videos",
        id: previous.id,
        data: { status: "superseded" },
        overrideAccess: true,
      });
    }
    await api.update({
      collection: "operation-groups",
      id: groupId,
      data: { status: "video_ready" },
      overrideAccess: true,
    });
    const drafts = await prepareDeliveryDrafts(payload, groupId, {
      correction: Boolean(previous && sentMessages.docs[0]),
    });
    return { duration, processedKey, thumbnailKey, drafts };
  } catch (error) {
    await api.update({
      collection: "operation-videos",
      id: video.id,
      data: {
        status: "failed",
        lastError: error instanceof Error ? error.message.slice(0, 1000) : "Video işleme hatası.",
      },
      overrideAccess: true,
    });
    throw error;
  }
}
