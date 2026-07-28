import { HttpError } from "./errors.js";
import { runProcess } from "./process.js";

const allowedVideoCodecs = new Set(["h264", "hevc", "vp8", "vp9", "av1", "mpeg4", "prores"]);
const allowedAudioCodecs = new Set([
  "aac", "opus", "vorbis", "mp3", "mp2",
  "pcm_s16le", "pcm_s24le", "pcm_s32le", "flac",
]);

export async function ffprobe(pathname) {
  const result = await runProcess("ffprobe", [
    "-v", "error",
    "-show_format",
    "-show_streams",
    "-of", "json",
    pathname,
  ], { timeoutMs: 60_000, logLimit: 256 * 1024 });
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error("ffprobe returned invalid JSON");
  }
}

export function validateProbe(probe, expectedMime, limits) {
  const formatName = String(probe?.format?.format_name || "").toLowerCase();
  const duration = Number(probe?.format?.duration);
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const videoStreams = streams.filter((stream) => stream.codec_type === "video" && stream.disposition?.attached_pic !== 1);
  const audioStreams = streams.filter((stream) => stream.codec_type === "audio");
  if (videoStreams.length !== 1) {
    throw new HttpError(422, "invalid_video_streams", "Video dosyasında tam olarak bir görüntü akışı bulunmalıdır.");
  }
  if (!Number.isFinite(duration) || duration <= 0 || duration > limits.maxSeconds) {
    throw new HttpError(422, "video_duration_invalid", `Video süresi en fazla ${limits.maxSeconds} saniye olabilir.`);
  }
  const video = videoStreams[0];
  const width = Number(video.width);
  const height = Number(video.height);
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 16 ||
    height < 16 ||
    width > 8192 ||
    height > 8192
  ) {
    throw new HttpError(422, "video_resolution_invalid", "Video çözünürlüğü desteklenmiyor.");
  }
  const videoCodec = String(video.codec_name || "").toLowerCase();
  const audioCodec = audioStreams[0] ? String(audioStreams[0].codec_name || "").toLowerCase() : null;
  if (!allowedVideoCodecs.has(videoCodec) || (audioCodec && !allowedAudioCodecs.has(audioCodec))) {
    throw new HttpError(422, "video_codec_unsupported", "Video veya ses codec'i desteklenmiyor.");
  }

  let detectedMime;
  let containerFormat;
  if (/(^|,)webm(,|$)/.test(formatName)) {
    detectedMime = "video/webm";
    containerFormat = "webm";
  } else if (/(^|,)(mov|mp4|m4a|3gp|3g2|mj2)(,|$)/.test(formatName)) {
    detectedMime = expectedMime === "video/quicktime" ? "video/quicktime" : "video/mp4";
    containerFormat = expectedMime === "video/quicktime" ? "mov" : "mp4";
  } else {
    throw new HttpError(415, "video_container_unsupported", "Gerçek dosya biçimi MP4, MOV veya WebM değil.");
  }
  if (detectedMime !== expectedMime) {
    throw new HttpError(415, "video_mime_mismatch", "Bildirilen video türü gerçek dosya biçimiyle eşleşmiyor.");
  }
  return {
    duration,
    width,
    height,
    videoCodec,
    audioCodec,
    hasAudio: audioStreams.length > 0,
    detectedMime,
    containerFormat,
    raw: probe,
  };
}

export function outputDimensions(width, height) {
  const landscape = width >= height;
  const maxWidth = landscape ? 1920 : 1080;
  const maxHeight = landscape ? 1080 : 1920;
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  const even = (value) => Math.max(2, Math.floor(value / 2) * 2);
  return {
    width: even(width * ratio),
    height: even(height * ratio),
    scaled: ratio < 1,
  };
}
