import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { retryDeliveryMessage } from "@/lib/delivery/messages";
import { getPayloadClient } from "@/lib/payload";

export async function POST(
  _request: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }
  try {
    await retryDeliveryMessage(
      await getPayloadClient(),
      (await context.params).messageId,
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Mesaj yenilenemedi. Durumunu kontrol edip tekrar deneyin.",
      },
      { status: 400 },
    );
  }
}
