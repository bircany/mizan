import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The former Vercel/local-filesystem stream surface is intentionally disabled.
 * Media now leaves only the VDS video service through short-lived signed URLs.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Eski video akışı devre dışı bırakıldı.",
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
