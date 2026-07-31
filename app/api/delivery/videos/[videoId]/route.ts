import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Retired legacy per-message token endpoint. */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Bu eski video bağlantısı artık kullanılmıyor. Güncel grup bağlantısını Mizan Derneği'nden isteyin.",
    },
    {
      status: 410,
      headers: {
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
