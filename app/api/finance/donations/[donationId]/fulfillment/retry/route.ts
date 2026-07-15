import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { canManageFinance } from "@/lib/auth/roles";
import { fulfillPaidDonation } from "@/lib/payments/fulfillment";
import { getPayloadClient } from "@/lib/payload";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ donationId: string }> },
) {
  const user = await getAdminSession();
  if (!user || !canManageFinance(user.role)) {
    return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 403 });
  }

  try {
    const { donationId } = await params;
    const result = await fulfillPaidDonation(await getPayloadClient(), donationId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Teslimat tekrar denemesi basarisiz oldu." },
      { status: 400 },
    );
  }
}
