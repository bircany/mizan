import { NextResponse } from "next/server";

import {
  DeliveryAccessApiError,
  getDeliveryAccessMetadata,
} from "@/lib/delivery/access-api";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const metadata = await getDeliveryAccessMetadata(token);
    return NextResponse.json(
      { ok: true, ...metadata },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const known = error instanceof DeliveryAccessApiError;
    const status = known && error.status >= 400 && error.status <= 599
      ? error.status
      : 502;
    return NextResponse.json(
      {
        ok: false,
        error: known ? error.message : "Video servisine şu anda ulaşılamıyor.",
      },
      {
        status,
        headers: { "cache-control": "private, no-store" },
      },
    );
  }
}
