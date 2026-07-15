import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { createFieldSubmission, type StaffActor } from "@/lib/field-workflow";
import { getPayloadClient } from "@/lib/payload";

function getRequestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user?.id || !user.role) {
    return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || !body.fieldTaskId) {
      return NextResponse.json({ success: false, error: "Baslik ve saha gorevi zorunludur." }, { status: 400 });
    }

    const result = await createFieldSubmission(
      await getPayloadClient(),
      user as unknown as StaffActor,
      {
        fieldTaskId: body.fieldTaskId,
        title,
        summary: typeof body.summary === "string" ? body.summary.trim() : undefined,
        donationId: body.donationId,
        campaignId: body.campaignId,
      },
      getRequestIp(request),
    );
    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Kanit gonderimi olusturulamadi." },
      { status: 400 },
    );
  }
}
