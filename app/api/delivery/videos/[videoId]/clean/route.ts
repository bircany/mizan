import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { DeliveryAccessApiError, deliveryVideoApiRequest } from "@/lib/delivery/access-api";

export async function POST(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const { videoId } = await context.params;
  if (!/^\d+$/.test(videoId)) return NextResponse.json({ error: "Geçersiz video." }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (body?.confirm !== "clean" && body?.confirm !== "force-clean") {
    return NextResponse.json({ error: "Temizleme onayı eksik." }, { status: 400 });
  }
  try {
    const result = await deliveryVideoApiRequest(`/v1/internal/videos/${videoId}/clean`, {
      method: "POST",
      body: JSON.stringify({
        confirm: body.confirm,
        actorId: user.id,
        groupCode: body.confirm === "force-clean" ? body.groupCode : undefined,
      }),
    });
    return NextResponse.json(result.body, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof DeliveryAccessApiError ? error.message : "Video temizlenemedi." }, {
      status: error instanceof DeliveryAccessApiError ? error.status : 502,
    });
  }
}
