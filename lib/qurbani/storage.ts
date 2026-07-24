import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { ensureLocalEnvLoaded } from "@/lib/env";

export type QurbaniVideoKind = "uploads" | "raw" | "processed" | "covers" | "temp";

const ALLOWED_KINDS = new Set<QurbaniVideoKind>([
  "uploads",
  "raw",
  "processed",
  "covers",
  "temp",
]);

function configuredRoot() {
  ensureLocalEnvLoaded();
  const configured = process.env.QURBANI_STORAGE_ROOT?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }
  return process.env.NODE_ENV === "production"
    ? "/data/qurbani"
    : path.join(/*turbopackIgnore: true*/ process.cwd(), "var", "qurbani");
}

function safeSegment(value: string) {
  const normalized = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(normalized)) {
    throw new Error("Gecersiz kurban video dosya anahtari.");
  }
  return normalized;
}

export interface QurbaniVideoStorage {
  readonly root: string;
  ensureDirectories(): Promise<void>;
  resolve(kind: QurbaniVideoKind, key: string): string;
  exists(kind: QurbaniVideoKind, key: string): Promise<boolean>;
  move(fromKind: QurbaniVideoKind, fromKey: string, toKind: QurbaniVideoKind, toKey: string): Promise<void>;
  remove(kind: QurbaniVideoKind, key: string): Promise<void>;
  stream(kind: QurbaniVideoKind, key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number }>;
}

class FileSystemQurbaniVideoStorage implements QurbaniVideoStorage {
  readonly root = configuredRoot();

  async ensureDirectories() {
    await Promise.all([...ALLOWED_KINDS].map((kind) => mkdir(path.join(this.root, kind), { recursive: true })));
  }

  resolve(kind: QurbaniVideoKind, key: string) {
    if (!ALLOWED_KINDS.has(kind)) throw new Error("Gecersiz kurban video dizini.");
    const resolved = path.resolve(this.root, kind, safeSegment(key));
    const expectedParent = path.resolve(this.root, kind) + path.sep;
    if (!resolved.startsWith(expectedParent)) throw new Error("Video yolu depolama dizini disina cikamaz.");
    return resolved;
  }

  async exists(kind: QurbaniVideoKind, key: string) {
    try {
      await stat(this.resolve(kind, key));
      return true;
    } catch {
      return false;
    }
  }

  async move(fromKind: QurbaniVideoKind, fromKey: string, toKind: QurbaniVideoKind, toKey: string) {
    await this.ensureDirectories();
    await rename(this.resolve(fromKind, fromKey), this.resolve(toKind, toKey));
  }

  async remove(kind: QurbaniVideoKind, key: string) {
    try {
      await unlink(this.resolve(kind, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async stream(kind: QurbaniVideoKind, key: string) {
    const filePath = this.resolve(kind, key);
    const fileStat = await stat(filePath);
    return {
      body: Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>,
      size: fileStat.size,
    };
  }
}

let storage: QurbaniVideoStorage | null = null;

export function getQurbaniVideoStorage() {
  storage ??= new FileSystemQurbaniVideoStorage();
  return storage;
}

export function getQurbaniVideoLimits() {
  ensureLocalEnvLoaded();
  const maxBytes = Number(process.env.QURBANI_MAX_VIDEO_BYTES || 1_073_741_824);
  const maxSeconds = Number(process.env.QURBANI_MAX_VIDEO_SECONDS || 900);
  return {
    maxBytes: Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : 1_073_741_824,
    maxSeconds: Number.isFinite(maxSeconds) && maxSeconds > 0 ? maxSeconds : 900,
  };
}
