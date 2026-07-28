import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { retryDeliveryMessage } from "@/lib/delivery/messages";
import { getPayloadClient } from "@/lib/payload";

export async function POST(
  _request: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  const user = await getAdminSession();
  if (!user || !["admin", "field_operator"].includes(user.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }
  try {
    await retryDeliveryMessage(
      await getPayloadClient(),
      (await context.params).messageId,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Mesaj yenilenemedi.",
      },
      { status: 400 },
    );
  }
}
