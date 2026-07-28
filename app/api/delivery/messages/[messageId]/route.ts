import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  const user = await getAdminSession();
  if (!user || !["admin", "field_operator"].includes(user.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }
  try {
    const body = (await request.json()) as { body?: unknown };
    const messageBody =
      typeof body.body === "string" ? body.body.trim() : "";
    if (!messageBody || messageBody.length > 4000) {
      throw new Error("Mesaj 1-4000 karakter arasında olmalıdır.");
    }
    const payload = await getPayloadClient();
    const id = (await context.params).messageId;
    const message = await payload.findByID({
      collection: "delivery-messages",
      id,
      depth: 0,
      overrideAccess: true,
    });
    if (message.status !== "draft") {
      throw new Error("Yalnızca taslak mesaj düzenlenebilir.");
    }
    await payload.update({
      collection: "delivery-messages",
      id,
      data: { body: messageBody },
      overrideAccess: true,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Mesaj güncellenemedi.",
      },
      { status: 400 },
    );
  }
}
