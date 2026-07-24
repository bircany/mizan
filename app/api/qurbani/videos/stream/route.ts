import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { getQurbaniVideoStorage } from "@/lib/qurbani/storage";
import { resolveQurbaniAccess } from "@/lib/qurbani/tracking";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const access = await resolveQurbaniAccess(token, true);
  if (!access) return new Response("Video baglantisi gecersiz veya suresi dolmus.", { status: 404, headers: { "cache-control": "private, no-store" } });
  const headers = new Headers({ "content-type": "video/mp4", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive", "content-disposition": `inline; filename=\"${access.code || "mizan-kurban"}.mp4\"` });
  if (process.env.NODE_ENV === "production") {
    headers.set("x-accel-redirect", `/_protected/qurbani/${encodeURIComponent(access.processedStorageKey)}`);
    return new Response(null, { headers });
  }
  const filePath = getQurbaniVideoStorage().resolve("processed", access.processedStorageKey);
  const info = await stat(filePath).catch(() => null);
  if (!info) {
    return new Response("Video dosyasi bulunamadi.", {
      status: 404,
      headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" },
    });
  }
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${info.size}` } });
    headers.set("accept-ranges", "bytes"); headers.set("content-range", `bytes ${start}-${end}/${info.size}`); headers.set("content-length", String(end - start + 1));
    return new Response(Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>, { status: 206, headers });
  }
  headers.set("accept-ranges", "bytes"); headers.set("content-length", String(info.size));
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>, { headers });
}
