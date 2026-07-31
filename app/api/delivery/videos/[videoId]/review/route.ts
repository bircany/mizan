import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import {
  DeliveryAccessApiError,
  deliveryVideoApiRequest,
} from "@/lib/delivery/access-api";

export async function POST(
  request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin")
    return NextResponse.json(
      { error: "Teknik onay için yönetici yetkisi gerekir." },
      { status: 403 },
    );
  try {
    const { videoId } = await context.params;
    const input = await request.json();
    const { body } = await deliveryVideoApiRequest(
      `/v1/internal/videos/${encodeURIComponent(videoId)}/review`,
      {
        method: "POST",
        body: JSON.stringify({ ...input, actorId: user.id }),
      },
    );
    return NextResponse.json({ success: true, result: body });
  } catch (error) {
    const status = error instanceof DeliveryAccessApiError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Teknik kontrol kaydedilemedi.",
      },
      { status },
    );
  }
}
