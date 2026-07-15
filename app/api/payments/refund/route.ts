import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { canManageFinance } from "@/lib/auth/roles";
import { getPayloadClient } from "@/lib/payload";
import { executeFinanceAction } from "@/lib/payments/service";

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user || !canManageFinance(user.role)) {
    return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const payload = await getPayloadClient();
    const result = await executeFinanceAction(payload, {
      action: body.amount ? "refund_partial" : "refund_full",
      donationId: body.donationId,
      amount: body.amount ? Number(body.amount) : undefined,
      reason: body.reason,
      description: body.description,
      actorEmail: user.email,
      actorId: user.id,
      ip: getRequestIp(request),
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Iade basarisiz oldu.",
      },
      { status: 400 },
    );
  }
}
