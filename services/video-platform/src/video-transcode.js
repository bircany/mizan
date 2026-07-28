import { writeFile } from "node:fs/promises";
import path from "node:path";

import { runProcess } from "./process.js";
import { outputDimensions } from "./video-probe.js";

function ffmpegPath(value) {
  return String(value).replaceAll("\\", "/").replaceAll(":", "\\:");
}

function safeGroupCode(value) {
  return String(value || "MIZAN")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 32) || "MIZAN";
}

async function textFile(directory, basename, value) {
  const pathname = path.join(directory, basename);
  await writeFile(pathname, value, { encoding: "utf8", mode: 0o600 });
  return ffmpegPath(pathname);
}

export async function transcodeVideo(input) {
  const dimensions = outputDimensions(input.probe.width, input.probe.height);
  const prefix = `${input.video.id}-attempt-${input.video.attempt_count}`;
  const titleFile = await textFile(input.processingDir, `${prefix}-title.txt`, input.settings.closingTitle);
  const messageFile = await textFile(input.processingDir, `${prefix}-message.txt`, input.settings.closingMessage);
  const creditFile = await textFile(input.processingDir, `${prefix}-credit.txt`, input.settings.closingCredit);
  const groupFile = await textFile(input.processingDir, `${prefix}-group.txt`, safeGroupCode(input.group.code));
  const logoWidth = Math.max(72, Math.min(240, Math.round(dimensions.width * 0.14 / 2) * 2));
  const cardLogoWidth = Math.max(100, Math.min(320, Math.round(dimensions.width * 0.22 / 2) * 2));
  const regular = ffmpegPath(input.storage.fontRegular);
  const bold = ffmpegPath(input.storage.fontBold);
  const logo = input.storage.logo;

  const args = [
    "-hide_banner", "-nostdin", "-y",
    "-i", input.sourcePath,
    "-loop", "1", "-i", logo,
    "-f", "lavfi", "-t", "3", "-i", `color=c=0x0B3D2E:s=${dimensions.width}x${dimensions.height}:r=30`,
    "-f", "lavfi", "-t", "3", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  ];
  let mainAudio;
  if (input.probe.hasAudio) {
    mainAudio = "[0:a:0]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad," +
      `atrim=0:${input.probe.duration.toFixed(3)},asetpts=PTS-STARTPTS[maina]`;
  } else {
    args.push(
      "-f", "lavfi", "-t", input.probe.duration.toFixed(3),
      "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    );
    mainAudio = "[4:a:0]asetpts=PTS-STARTPTS[maina]";
  }
  const groupY = Math.max(96, 24 + Math.round(logoWidth * 0.8));
  const fontSize = Math.max(18, Math.round(dimensions.width * 0.022));
  const groupBoxWidth = Math.min(dimensions.width - 48, Math.max(220, logoWidth + 100));
  const titleSize = Math.max(26, Math.round(dimensions.width * 0.046));
  const messageSize = Math.max(20, Math.round(dimensions.width * 0.03));
  const creditSize = Math.max(16, Math.round(dimensions.width * 0.021));
  const filter = [
    `[0:v:0]scale=${dimensions.width}:${dimensions.height}:flags=lanczos,setsar=1,fps=30,format=yuv420p[base]`,
    `[1:v:0]scale=${logoWidth}:-2[mainlogo]`,
    `[base][mainlogo]overlay=W-w-24:24:format=auto,` +
      `drawbox=x=W-${groupBoxWidth}-24:y=${groupY - 8}:w=${groupBoxWidth}:h=${fontSize + 24}:color=black@0.55:t=fill,` +
      `drawtext=fontfile='${bold}':textfile='${groupFile}':fontcolor=white:fontsize=${fontSize}:x=W-text_w-32:y=${groupY}[mainv]`,
    mainAudio,
    "[2:v:0]setsar=1,fps=30,format=yuv420p[cardbase]",
    `[1:v:0]scale=${cardLogoWidth}:-2[cardlogo]`,
    `[cardbase][cardlogo]overlay=(W-w)/2:H*0.13:format=auto,` +
      `drawtext=fontfile='${bold}':textfile='${titleFile}':fontcolor=white:fontsize=${titleSize}:x=(W-text_w)/2:y=H*0.48,` +
      `drawtext=fontfile='${regular}':textfile='${messageFile}':fontcolor=white:fontsize=${messageSize}:x=(W-text_w)/2:y=H*0.59,` +
      `drawtext=fontfile='${regular}':textfile='${creditFile}':fontcolor=white@0.82:fontsize=${creditSize}:x=(W-text_w)/2:y=H*0.82[cardv]`,
    "[3:a:0]asetpts=PTS-STARTPTS[carda]",
    "[mainv][maina][cardv][carda]concat=n=2:v=1:a=1[vout][aout]",
  ].join(";");
  args.push(
    "-filter_complex", filter,
    "-map", "[vout]", "-map", "[aout]",
    "-map_metadata", "-1", "-map_chapters", "-1",
    "-c:v", "libx264", "-preset", input.preset,
    "-crf", String(input.crf),
    "-profile:v", "high", "-level:v", "4.1",
    "-pix_fmt", "yuv420p", "-threads", String(input.settings.ffmpegThreads),
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart",
    "-max_muxing_queue_size", "4096",
    input.outputPath,
  );
  const result = await runProcess("ffmpeg", args, {
    timeoutMs: input.settings.ffmpegTimeoutMs,
    logLimit: 512 * 1024,
  });
  return {
    ...result,
    dimensions,
    snapshots: {
      processing: {
        container: "mp4",
        videoCodec: "h264",
        audioCodec: "aac",
        crf: input.crf,
        preset: input.preset,
        faststart: true,
        maxResolution: "1080p",
        noUpscale: true,
        loudness: { integrated: -16, truePeak: -1.5, range: 11 },
        ffmpegThreads: input.settings.ffmpegThreads,
      },
      watermark: {
        required: true,
        logoAsset: "mizan-logo.png",
        position: "top-right",
        groupCode: safeGroupCode(input.group.code),
      },
      closingCard: {
        durationSeconds: 3,
        title: input.settings.closingTitle,
        message: input.settings.closingMessage,
        credit: input.settings.closingCredit,
        width: dimensions.width,
        height: dimensions.height,
      },
    },
  };
}
