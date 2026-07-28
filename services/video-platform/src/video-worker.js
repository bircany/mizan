import { access, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { retentionConfig, storageConfig, videoWorkerConfig } from "./config.js";
import { diskStatus, hasProcessingCapacity } from "./disk.js";
import { HttpError } from "./errors.js";
import { hashFile } from "./file-hash.js";
import { heartbeat } from "./heartbeat.js";
import { logger } from "./logger.js";
import { installShutdown } from "./shutdown.js";
import {
  ensureStorageDirectories,
  moveFile,
  resolveExistingFile,
  resolveStorageKey,
} from "./storage.js";
import { ffprobe, validateProbe } from "./video-probe.js";
import {
  claimVideo,
  findDuplicateSource,
  markVideoFailed,
  markVideoProcessed,
  releaseVideoClaim,
  updateRawStorage,
} from "./video-repository.js";
import { transcodeVideo } from "./video-transcode.js";

const settings = videoWorkerConfig();
const storage = storageConfig();
const retention = retentionConfig();
const abortController = new AbortController();
const heartbeatPath = process.env.HEALTH_FILE || "/tmp/mizan-video-worker.health";

function sleep(milliseconds) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    abortController.signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

async function exists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function relativeKey(root, pathname) {
  return path.relative(root, pathname).replaceAll("\\", "/");
}

async function ensureRawSource(video) {
  const rawKey = String(video.raw_storage_key || "");
  if (rawKey) {
    try {
      return {
        ...(await resolveExistingFile(storage.raw, rawKey)),
        key: rawKey,
      };
    } catch (error) {
      if (!(error instanceof HttpError) || error.statusCode !== 404) throw error;
    }
  }
  const uploadFile = await resolveExistingFile(storage.uploads, String(video.upload_id));
  const rawKeyForVideo = `${video.group_id}/${video.upload_id}.source`;
  const rawPath = resolveStorageKey(storage.raw, rawKeyForVideo);
  await moveFile(uploadFile.path, rawPath);
  await unlink(resolveStorageKey(storage.uploads, `${video.upload_id}.info`)).catch(() => {});
  await updateRawStorage(video.id, rawKeyForVideo);
  return {
    path: rawPath,
    stat: await stat(rawPath),
    key: rawKeyForVideo,
  };
}

function duplicateOverrideApproved(video) {
  return video.technical_metadata?.duplicateOverrideApproved === true;
}

async function quarantineSource(video, source) {
  const key = `${video.group_id}/${video.upload_id}.source`;
  const destination = resolveStorageKey(storage.quarantine, key);
  await moveFile(source.path, destination);
  return key;
}

async function processClaim(claim) {
  const video = claim.video;
  let source;
  let outputPath;
  let ffmpegLog = "";
  try {
    source = await ensureRawSource(video);
    if (source.stat.size <= 0 || source.stat.size > settings.maxBytes) {
      throw new HttpError(413, "SOURCE_SIZE_INVALID", "Ham video 2 GB sınırını aşıyor veya boş.");
    }
    const [rawSha256, sourceProbe, currentDisk] = await Promise.all([
      hashFile(source.path),
      ffprobe(source.path),
      diskStatus(storage.processing, retention),
    ]);
    const probe = validateProbe(sourceProbe, String(video.mime_type).toLowerCase(), settings);
    const capacity = hasProcessingCapacity(currentDisk, source.stat.size, retention.ffmpegReserveBytes);
    if (!capacity.allowed) {
      throw new HttpError(507, "INSUFFICIENT_PROCESSING_SPACE", "Video işleme için yeterli güvenli geçici alan yok.");
    }

    const duplicate = await findDuplicateSource(video.id, video.group_id, rawSha256);
    if (duplicate && !duplicateOverrideApproved(video)) {
      throw new HttpError(
        409,
        "DUPLICATE_SOURCE",
        "Aynı video bu gruba daha önce yüklenmiş. Yeni sürüm için yetkili onayı gerekiyor.",
      );
    }

    outputPath = path.join(storage.processing, `${video.id}-attempt-${video.attempt_count}.mp4`);
    let transcode = await transcodeVideo({
      sourcePath: source.path,
      outputPath,
      processingDir: storage.processing,
      probe,
      video,
      group: { code: video.group_code },
      storage,
      settings,
      crf: 23,
      preset: "medium",
    });
    ffmpegLog += transcode.stderr;
    let outputStat = await stat(outputPath);
    if (outputStat.size > source.stat.size * settings.outputGrowthRatio) {
      await unlink(outputPath);
      transcode = await transcodeVideo({
        sourcePath: source.path,
        outputPath,
        processingDir: storage.processing,
        probe,
        video,
        group: { code: video.group_code },
        storage,
        settings,
        crf: 26,
        preset: "slow",
      });
      ffmpegLog += `\n--- efficient-profile ---\n${transcode.stderr}`;
      outputStat = await stat(outputPath);
    }
    if (outputStat.size <= 0 || outputStat.size > settings.maxBytes) {
      throw new HttpError(422, "PROCESSED_SIZE_INVALID", "İşlenmiş video güvenli boyut sınırını aşıyor.");
    }
    const outputProbe = validateProbe(
      await ffprobe(outputPath),
      "video/mp4",
      { maxSeconds: settings.maxSeconds + 3.5 },
    );
    if (outputProbe.videoCodec !== "h264" || outputProbe.audioCodec !== "aac") {
      throw new Error("Processed output codec contract failed");
    }
    const processedSha256 = await hashFile(outputPath);
    const readyKey = `${video.group_id}/${video.upload_id}-v${video.version}.mp4`;
    const readyPath = resolveStorageKey(storage.ready, readyKey);
    await moveFile(outputPath, readyPath);
    outputPath = null;

    await markVideoProcessed(video.id, {
      probe,
      outputProbe,
      rawSha256,
      processedSha256,
      rawStorageKey: source.key,
      processedStorageKey: readyKey,
      outputBytes: outputStat.size,
      snapshots: transcode.snapshots,
      slaughterScriptSnapshot: video.slaughter_script_snapshot || video.group_slaughter_script_snapshot,
      ffmpegLog,
    });
    logger.info("Video processing completed; awaiting human review", {
      videoId: video.id,
      groupId: video.group_id,
      attempt: video.attempt_count,
      rawBytes: source.stat.size,
      outputBytes: outputStat.size,
      width: outputProbe.width,
      height: outputProbe.height,
    });
  } catch (error) {
    const permanent = error instanceof HttpError;
    let quarantineStorageKey = null;
    const retryEligible = Number(video.attempt_count) < 2 && !permanent;
    if (!retryEligible && source && await exists(source.path)) {
      quarantineStorageKey = await quarantineSource(video, source).catch((moveError) => {
        ffmpegLog += `\nQuarantine move failed: ${moveError.message}`;
        return null;
      });
    }
    const adminLog = [
      ffmpegLog,
      error?.processResult?.stderr || "",
      error instanceof Error ? error.stack : String(error),
    ].filter(Boolean).join("\n");
    const result = await markVideoFailed(video, {
      retryDelaySeconds: settings.retryDelaySeconds,
      forceQuarantine: permanent,
      quarantineStorageKey,
      publicMessage: error instanceof HttpError
        ? error.message
        : "Video işlenirken teknik bir hata oluştu. Sistem bir kez daha otomatik deneyecek.",
      code: error instanceof HttpError ? error.code : "FFMPEG_PROCESSING_FAILED",
      adminLog,
    });
    logger.error("Video processing failed", {
      videoId: video.id,
      groupId: video.group_id,
      attempt: video.attempt_count,
      retryScheduled: result.retry,
      quarantined: !result.retry,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (outputPath) await unlink(outputPath).catch(() => {});
    const prefix = `${video.id}-attempt-${video.attempt_count}`;
    for (const suffix of ["title.txt", "message.txt", "credit.txt", "group.txt"]) {
      await unlink(path.join(storage.processing, `${prefix}-${suffix}`)).catch(() => {});
    }
  }
}

await ensureStorageDirectories(storage);
await heartbeat(heartbeatPath);
logger.info("Video worker started", { workerId: settings.workerId });
installShutdown(abortController);

while (!abortController.signal.aborted) {
  let claim;
  try {
    await heartbeat(heartbeatPath);
    claim = await claimVideo(settings.workerId);
    if (!claim) {
      await sleep(settings.pollIntervalMs);
      continue;
    }
    await processClaim(claim);
    await heartbeat(heartbeatPath);
  } catch (error) {
    logger.error("Video worker loop failed", { error: error instanceof Error ? error.message : String(error) });
    await sleep(settings.pollIntervalMs);
  } finally {
    await releaseVideoClaim(claim);
  }
}
