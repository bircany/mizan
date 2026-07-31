import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import {
  DeliveryAccessApiError,
  deliveryVideoApiRequest,
} from "@/lib/delivery/access-api";

export async function POST(
  _request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  try {
    const { videoId } = await context.params;
    const { body } = await deliveryVideoApiRequest(
      `/v1/internal/videos/${encodeURIComponent(videoId)}/retry-processing`,
      { method: "POST", body: JSON.stringify({ actorId: user.id }) },
    );
    return NextResponse.json({ success: true, result: body });
  } catch (error) {
    const status = error instanceof DeliveryAccessApiError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Video yeniden işleme alınamadı.",
      },
      { status },
    );
  }
}
