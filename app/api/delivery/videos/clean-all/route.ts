import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { DeliveryAccessApiError, deliveryVideoApiRequest } from "@/lib/delivery/access-api";

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.confirm !== "clean-all" || body?.confirmation !== "TÜM VİDEOLARI SİL") {
    return NextResponse.json({ error: "Toplu temizlik onayı eşleşmedi." }, { status: 400 });
  }
  try {
    const result = await deliveryVideoApiRequest("/v1/internal/videos/clean-all", {
      method: "POST",
      body: JSON.stringify({ confirm: "clean-all", confirmation: body.confirmation, actorId: user.id }),
    });
    return NextResponse.json(result.body, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof DeliveryAccessApiError ? error.message : "Videolar toplu olarak temizlenemedi." }, {
      status: error instanceof DeliveryAccessApiError ? error.status : 502,
    });
  }
}
