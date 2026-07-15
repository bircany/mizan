import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { processWebhookNotification } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const payload = await getPayloadClient();
    const body = (await request.json()) as Record<string, unknown>;
    const signatureHeader = request.headers.get("x-iyz-signature-v3");

    const result = await processWebhookNotification(payload, body, signatureHeader);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Webhook islenemedi.",
      },
      { status: 400 },
    );
  }
}
