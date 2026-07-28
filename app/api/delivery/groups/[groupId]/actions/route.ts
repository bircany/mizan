import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { sendDeliveryWhatsApp } from "@/lib/delivery/evolution";
import {
  cancelDeliveryGroup,
  pauseDeliveryGroup,
  prepareDeliveryDrafts,
  queueDeliveryDrafts,
  resumeDeliveryGroup,
} from "@/lib/delivery/messages";
import { getPayloadClient } from "@/lib/payload";

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const user = await getAdminSession();
  if (!user || !["admin", "field_operator"].includes(user.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }
  try {
    const { groupId } = await context.params;
    const body = (await request.json()) as { action?: string };
    const payload = await getPayloadClient();
    let result: unknown;
    switch (body.action) {
      case "prepare":
        result = await prepareDeliveryDrafts(payload, groupId);
        break;
      case "queue":
        result = await queueDeliveryDrafts(payload, groupId, 5);
        break;
      case "pause":
        result = await pauseDeliveryGroup(payload, groupId);
        break;
      case "resume":
        result = await resumeDeliveryGroup(payload, groupId, 5);
        break;
      case "cancel":
        result = await cancelDeliveryGroup(payload, groupId);
        break;
      case "test": {
        const [operator, messages] = await Promise.all([
          payload.findByID({
            collection: "users",
            id: user.id,
            depth: 0,
            overrideAccess: true,
          }),
          payload.find({
            collection: "delivery-messages",
            where: {
              and: [
                { group: { equals: groupId } },
                { status: { equals: "draft" } },
              ],
            },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          }),
        ]);
        if (!operator.phone) {
          throw new Error("Profilinizde test telefonu tanımlı değil.");
        }
        if (!messages.docs[0]) throw new Error("Test edilecek taslak yok.");
        result = await sendDeliveryWhatsApp(
          operator.phone,
          `[TEST] ${messages.docs[0].body}`,
        );
        break;
      }
      default:
        throw new Error("Geçersiz teslimat işlemi.");
    }
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "İşlem uygulanamadı.",
      },
      { status: 400 },
    );
  }
}
