/** Metadata allowlist only. The upload worker still probes the actual file contents. */
export function deliveryVideoMime(fileName: string, requestedMime: string) {
  if (
    !fileName ||
    fileName.length > 180 ||
    /[\\/\u0000-\u001f\u007f]/.test(fileName)
  )
    return null;
  const extension = fileName.toLowerCase().match(/\.(mp4|mov|webm)$/)?.[1];
  const mime =
    extension === "mp4"
      ? "video/mp4"
      : extension === "mov"
        ? "video/quicktime"
        : extension === "webm"
          ? "video/webm"
          : null;
  const requested = requestedMime.trim().toLowerCase();
  return mime &&
    (!requested ||
      requested === "application/octet-stream" ||
      requested === mime)
    ? mime
    : null;
}
