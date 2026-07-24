import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase-server";

const COOKIE = "mizan_news_views";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  const viewed = new Set((request.cookies.get(COOKIE)?.value || "").split(".").filter(Boolean));
  const marker = Buffer.from(slug).toString("base64url");
  if (viewed.has(marker)) return NextResponse.json({ counted: false });
  const client = getSupabaseServiceClient();
  const { error } = await client.rpc("increment_news_view_count", { p_slug: slug });
  if (error) return NextResponse.json({ error: "view_not_recorded" }, { status: 503 });
  viewed.add(marker);
  const response = NextResponse.json({ counted: true });
  response.cookies.set(COOKIE, [...viewed].slice(-30).join("."), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12, path: "/" });
  return response;
}
