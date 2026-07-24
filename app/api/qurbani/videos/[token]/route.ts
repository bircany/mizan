import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { resolveQurbaniAccess } from "@/lib/qurbani/tracking";
import { getQurbaniVideoStorage } from "@/lib/qurbani/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const access = await resolveQurbaniAccess(token, true);
  if (!access) return new Response("Video baglantisi gecersiz veya suresi dolmus.", { status: 404, headers: { "cache-control": "private, no-store" } });

  const headers = new Headers({
    "content-type": "video/mp4",
    "cache-control": "private, no-store",
    "content-disposition": `inline; filename=\"${access.code || "mizan-kurban"}.mp4\"`,
    "x-robots-tag": "noindex, nofollow, noarchive",
  });
  if (process.env.NODE_ENV === "production") {
    headers.set("x-accel-redirect", `/_protected/qurbani/${encodeURIComponent(access.processedStorageKey)}`);
    return new Response(null, { status: 200, headers });
  }

  const filePath = getQurbaniVideoStorage().resolve("processed", access.processedStorageKey);
  const file = await stat(filePath).catch(() => null);
  if (!file) {
    return new Response("Video dosyasi bulunamadi.", {
      status: 404,
      headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" },
    });
  }
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return new Response(null, { status: 416, headers: { "content-range": `bytes */${file.size}` } });
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), file.size - 1) : file.size - 1;
    if (start > end || start >= file.size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${file.size}` } });
    headers.set("accept-ranges", "bytes");
    headers.set("content-range", `bytes ${start}-${end}/${file.size}`);
    headers.set("content-length", String(end - start + 1));
    const body = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
    return new Response(body, { status: 206, headers });
  }
  headers.set("accept-ranges", "bytes");
  headers.set("content-length", String(file.size));
  const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
  return new Response(body, { status: 200, headers });
}
