import { pathToFileURL } from "node:url";
import { readFile, writeFile } from "node:fs/promises";

export async function heartbeat(pathname) {
  await writeFile(pathname, new Date().toISOString(), { encoding: "utf8", mode: 0o600 });
}

export async function assertHeartbeat(pathname, maxAgeSeconds) {
  const timestamp = Date.parse(await readFile(pathname, "utf8"));
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > maxAgeSeconds * 1000) {
    throw new Error("Worker heartbeat is stale");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pathname = process.argv[2];
  const maxAgeSeconds = Number(process.argv[3]);
  if (!pathname || !Number.isFinite(maxAgeSeconds)) process.exit(2);
  await assertHeartbeat(pathname, maxAgeSeconds);
}
