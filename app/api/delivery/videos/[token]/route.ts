import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Retired legacy per-message token endpoint.
 *
 * Current delivery links are group-stable `/video/:token` links and require an
 * eight-character access code. Keeping this route as an explicit tombstone
 * prevents accidental fallback to Vercel/local-filesystem video delivery.
 */
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
