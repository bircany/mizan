import { createReadStream } from "node:fs";
import { access, copyFile, mkdir, open, realpath, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { HttpError } from "./errors.js";

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function safeStorageKey(value) {
  const key = String(value ?? "").replaceAll("\\", "/");
  if (
    !key ||
    key.includes("\0") ||
    key.startsWith("/") ||
    key.split("/").some((part) => part === "" || part === "." || part === "..") ||
    !/^[A-Za-z0-9._/-]+$/.test(key)
  ) {
    throw new HttpError(400, "invalid_storage_key", "Geçersiz depolama anahtarı.");
  }
  return key;
}

export function resolveStorageKey(root, key) {
  const normalizedRoot = path.resolve(root);
  const candidate = path.resolve(normalizedRoot, safeStorageKey(key));
  if (!isInside(normalizedRoot, candidate)) {
    throw new HttpError(400, "invalid_storage_key", "Geçersiz depolama anahtarı.");
  }
  return candidate;
}

export async function resolveExistingFile(root, key) {
  let normalizedRoot;
  let candidate;
  try {
    normalizedRoot = await realpath(root);
    candidate = await realpath(resolveStorageKey(normalizedRoot, key));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new HttpError(404, "video_not_found", "Video bulunamadı.");
    }
    throw error;
  }
  if (!isInside(normalizedRoot, candidate)) {
    throw new HttpError(400, "invalid_storage_key", "Geçersiz depolama anahtarı.");
  }
  const metadata = await stat(candidate);
  if (!metadata.isFile()) throw new HttpError(404, "video_not_found", "Video bulunamadı.");
  return { path: candidate, stat: metadata };
}

export async function assertExistingPathWithin(root, suppliedPath) {
  const normalizedRoot = await realpath(root);
  const candidate = await realpath(path.resolve(suppliedPath));
  if (!isInside(normalizedRoot, candidate)) {
    throw new HttpError(400, "untrusted_upload_path", "Upload depolama yolu geçersiz.");
  }
  return candidate;
}

export async function ensureStorageDirectories(
  config,
  selected = ["uploads", "raw", "processing", "ready", "replaced", "quarantine"],
  requireAssets = true,
) {
  for (const name of selected) {
    const directory = config[name];
    if (!directory) throw new Error(`Unknown storage directory: ${name}`);
    await mkdir(directory, { recursive: true });
    await access(directory);
  }
  if (requireAssets) {
    await Promise.all([access(config.logo), access(config.fontRegular), access(config.fontBold)]);
  }
}

export async function moveFile(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await rename(source, destination);
  } catch (error) {
    if (error?.code !== "EXDEV") throw error;
    const temporary = `${destination}.partial-${process.pid}-${Date.now()}`;
    await copyFile(source, temporary);
    const handle = await open(temporary, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    const [sourceStat, copiedStat] = await Promise.all([stat(source), stat(temporary)]);
    if (sourceStat.size !== copiedStat.size) {
      await unlink(temporary).catch(() => {});
      throw new Error("Cross-volume copy size mismatch");
    }
    await rename(temporary, destination);
    await unlink(source);
  }
}

export function openFileStream(filePath, range) {
  return createReadStream(filePath, range ? { start: range.start, end: range.end } : undefined);
}

export function parseSingleRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) {
    throw new HttpError(416, "invalid_range", "Geçersiz video aralığı.");
  }
  let start;
  let end;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new HttpError(416, "invalid_range", "Geçersiz video aralığı.");
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    throw new HttpError(416, "invalid_range", "İstenen video aralığı mevcut değil.");
  }
  return { start, end: Math.min(end, size - 1) };
}

export function contentDisposition(kind, filename) {
  const fallback = String(filename || "mizan-video.mp4")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\\r\n]/g, "_")
    .slice(0, 120) || "mizan-video.mp4";
  const encoded = encodeURIComponent(String(filename || "mizan-video.mp4"))
    .replaceAll("'", "%27")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29");
  return `${kind}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
