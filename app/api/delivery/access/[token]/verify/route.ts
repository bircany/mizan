import { NextResponse } from "next/server";

import {
  DeliveryAccessApiError,
  verifyDeliveryAccess,
} from "@/lib/delivery/access-api";

export const dynamic = "force-dynamic";

function requestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => null) as {
      accessCode?: unknown;
    } | null;
    const authorization = await verifyDeliveryAccess(
      token,
      typeof body?.accessCode === "string" ? body.accessCode : "",
      {
        ipAddress: requestIp(request),
        userAgent: request.headers.get("user-agent"),
      },
    );
    return NextResponse.json(
      { ok: true, ...authorization },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const known = error instanceof DeliveryAccessApiError;
    const status = known && error.status >= 400 && error.status <= 599
      ? error.status
      : 502;
    const headers = new Headers({ "cache-control": "private, no-store" });
    if (known && error.retryAfterSeconds) {
      headers.set("retry-after", String(error.retryAfterSeconds));
    }
    return NextResponse.json(
      {
        ok: false,
        error: known ? error.message : "Video erişimi şu anda doğrulanamıyor.",
      },
      { status, headers },
    );
  }
}
