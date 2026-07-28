import { statfs } from "node:fs/promises";

export async function diskStatus(pathname, thresholds) {
  const stats = await statfs(pathname);
  const freeBytes = Number(stats.bavail) * Number(stats.bsize);
  const totalBytes = Number(stats.blocks) * Number(stats.bsize);
  return {
    freeBytes,
    totalBytes,
    warning: freeBytes < thresholds.warningBytes,
    uploadsBlocked: freeBytes < thresholds.blockBytes,
  };
}

export function hasProcessingCapacity(status, sourceBytes, reserveBytes) {
  const requiredBytes = Math.ceil(Number(sourceBytes) * 2.5) + reserveBytes;
  return {
    allowed: status.freeBytes >= requiredBytes,
    requiredBytes,
  };
}
