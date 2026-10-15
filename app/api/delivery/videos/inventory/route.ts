import { NextRequest, NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { DeliveryAccessApiError, DeliveryVideoApiUnavailableError, deliveryVideoApiRequest } from "@/lib/delivery/access-api";

export async function GET(request: NextRequest) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const cursor = request.nextUrl.searchParams.get("cursor");
  if (cursor && !/^\d+$/.test(cursor)) return NextResponse.json({ error: "Geçersiz sayfa." }, { status: 400 });
  try {
    const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const { body } = await deliveryVideoApiRequest(`/v1/internal/videos${suffix}`, { method: "GET" });
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof DeliveryVideoApiUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof DeliveryAccessApiError && error.status === 404) {
      return NextResponse.json({ error: "Video arşivi VDS sunucusunda henüz yayınlanmamış." }, { status: 503 });
    }
    return NextResponse.json({ error: "VDS video listesi alınamadı." }, {
      status: error instanceof DeliveryAccessApiError ? error.status : 502,
    });
  }
}
