import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { ensureLocalEnvLoaded } from "@/lib/env";

const ABSOLUTE_MAX_VIDEO_BYTES = 2_147_483_648;
const ABSOLUTE_MAX_VIDEO_SECONDS = 600;

export type DeliveryStorageKind = "uploads" | "raw" | "processed" | "covers" | "temp";

const KINDS = new Set<DeliveryStorageKind>(["uploads", "raw", "processed", "covers", "temp"]);

function storageRoot() {
  ensureLocalEnvLoaded();
  const configured = process.env.DELIVERY_STORAGE_ROOT?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
  }
  return process.env.NODE_ENV === "production"
    ? "/data/delivery"
    : path.join(/* turbopackIgnore: true */ process.cwd(), "var", "delivery");
}

function safeKey(value: string) {
  const key = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(key)) {
    throw new Error("Gecersiz teslimat dosya anahtari.");
  }
  return key;
}

class DeliveryVideoStorage {
  readonly root = storageRoot();

  async ensureDirectories() {
    await Promise.all([...KINDS].map((kind) => mkdir(path.join(this.root, kind), { recursive: true })));
  }

  resolve(kind: DeliveryStorageKind, key: string) {
    if (!KINDS.has(kind)) throw new Error("Gecersiz teslimat dizini.");
    const parent = path.resolve(this.root, kind);
    const resolved = path.resolve(parent, safeKey(key));
    if (!resolved.startsWith(`${parent}${path.sep}`)) {
      throw new Error("Dosya yolu teslimat dizini disina cikamaz.");
    }
    return resolved;
  }

  async move(fromKind: DeliveryStorageKind, fromKey: string, toKind: DeliveryStorageKind, toKey: string) {
    await this.ensureDirectories();
    await rename(this.resolve(fromKind, fromKey), this.resolve(toKind, toKey));
  }

  async remove(kind: DeliveryStorageKind, key: string) {
    try {
      await unlink(this.resolve(kind, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async stat(kind: DeliveryStorageKind, key: string) {
    return stat(this.resolve(kind, key));
  }

  async exists(kind: DeliveryStorageKind, key: string) {
    try {
      await this.stat(kind, key);
      return true;
    } catch {
      return false;
    }
  }

  async stream(kind: DeliveryStorageKind, key: string) {
    const file = await this.stat(kind, key);
    return {
      size: file.size,
      body: Readable.toWeb(createReadStream(this.resolve(kind, key))) as ReadableStream<Uint8Array>,
    };
  }
}

let instance: DeliveryVideoStorage | null = null;

export function getDeliveryVideoStorage() {
  instance ??= new DeliveryVideoStorage();
  return instance;
}

export function getDeliveryVideoLimits() {
  ensureLocalEnvLoaded();
  const maxBytes = Number(process.env.DELIVERY_MAX_VIDEO_BYTES || ABSOLUTE_MAX_VIDEO_BYTES);
  const maxSeconds = Number(process.env.DELIVERY_MAX_VIDEO_SECONDS || ABSOLUTE_MAX_VIDEO_SECONDS);
  return {
    maxBytes:
      Number.isFinite(maxBytes) && maxBytes > 0
        ? Math.min(Math.floor(maxBytes), ABSOLUTE_MAX_VIDEO_BYTES)
        : ABSOLUTE_MAX_VIDEO_BYTES,
    maxSeconds:
      Number.isFinite(maxSeconds) && maxSeconds > 0
        ? Math.min(Math.floor(maxSeconds), ABSOLUTE_MAX_VIDEO_SECONDS)
        : ABSOLUTE_MAX_VIDEO_SECONDS,
  };
}

export function getTusdConfiguration() {
  ensureLocalEnvLoaded();
  const endpoint = process.env.DELIVERY_TUSD_URL?.trim();
  if (!endpoint) throw new Error("DELIVERY_TUSD_URL is not configured.");
  return {
    endpoint: endpoint.replace(/\/$/, ""),
    hookSecret: process.env.DELIVERY_TUSD_HOOK_SECRET?.trim() || "",
  };
}
