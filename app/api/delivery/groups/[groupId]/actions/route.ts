import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import {
  DeliveryAccessApiError,
  deliveryVideoApiRequest,
} from "@/lib/delivery/access-api";
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
    const input = (await request.json()) as {
      action?: string;
      recipientKey?: string;
    };
    if (!/^\d+$/.test(groupId)) throw new Error("Grup kimliği geçersiz.");
    if (
      ["queue", "resume", "cancel"].includes(String(input.action)) &&
      user.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Gerçek gönderim işlemleri için yönetici yetkisi gerekir." },
        { status: 403 },
      );
    }

    let result: unknown;
    if (
      ["prepare", "queue", "pause", "resume", "cancel"].includes(
        String(input.action),
      )
    ) {
      result = (
        await deliveryVideoApiRequest(
          `/v1/internal/groups/${encodeURIComponent(groupId)}/dispatch`,
          {
            method: "POST",
            body: JSON.stringify({ action: input.action, actorId: user.id }),
          },
        )
      ).body;
    } else if (input.action === "test") {
      const payload = await getPayloadClient();
      const [messages, recipientsResponse] = await Promise.all([
        payload.find({
          collection: "delivery-messages",
          where: {
            and: [
              { group: { equals: groupId } },
              { status: { equals: "draft" } },
              { isTest: { equals: false } },
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        }),
        deliveryVideoApiRequest("/v1/internal/test-recipients", {
          method: "GET",
        }),
      ]);
      const source = messages.docs[0];
      if (!source) throw new Error("Test edilecek taslak yok.");
      const recipients = Array.isArray(recipientsResponse.body.recipients)
        ? (recipientsResponse.body.recipients as Array<{ key?: string }>)
        : [];
      const recipientKey = input.recipientKey || recipients[0]?.key;
      if (!recipientKey)
        throw new Error("VDS üzerinde güvenli test alıcısı tanımlı değil.");
      result = (
        await deliveryVideoApiRequest("/v1/internal/test-messages", {
          method: "POST",
          body: JSON.stringify({
            sourceMessageId: source.id,
            recipientKey,
            actorId: user.id,
            idempotencyKey: `test:${groupId}:${source.id}:${randomUUID()}`,
          }),
        })
      ).body;
    } else {
      throw new Error("Geçersiz teslimat işlemi.");
    }
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "İşlem uygulanamadı.",
      },
      { status: error instanceof DeliveryAccessApiError ? error.status : 400 },
    );
  }
}
