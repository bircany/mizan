import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { getQurbaniVideoStorage } from "@/lib/qurbani/storage";

const documentRoot = () => path.join(getQurbaniVideoStorage().root, "documents");

function safeKey(value: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(value)) {
    throw new Error("Geçersiz kurban belge anahtarı.");
  }
  return value;
}

function resolveKey(key: string) {
  const root = path.resolve(documentRoot());
  const resolved = path.resolve(root, safeKey(key));
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Belge yolu depolama dizini dışına çıkamaz.");
  }
  return resolved;
}

export async function storeQurbaniDocument(key: string, content: Uint8Array) {
  await mkdir(documentRoot(), { recursive: true });
  await writeFile(resolveKey(key), content, { flag: "wx" });
}

export async function removeQurbaniDocument(key: string) {
  try {
    await unlink(resolveKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function streamQurbaniDocument(key: string) {
  const filePath = resolveKey(key);
  const fileStat = await stat(filePath);
  return {
    body: Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>,
    size: fileStat.size,
  };
}
