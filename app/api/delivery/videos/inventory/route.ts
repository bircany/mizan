import { NextRequest, NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { DeliveryAccessApiError, deliveryVideoApiRequest } from "@/lib/delivery/access-api";

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
    return NextResponse.json({ error: "VDS video listesi alınamadı." }, {
      status: error instanceof DeliveryAccessApiError ? error.status : 502,
    });
  }
}
