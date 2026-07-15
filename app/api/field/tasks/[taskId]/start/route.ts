import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { startFieldTask, type StaffActor } from "@/lib/field-workflow";
import { getPayloadClient } from "@/lib/payload";

function getRequestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
}

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await getAdminSession();
  if (!user?.id || !user.role) {
    return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 403 });
  }

  try {
    const { taskId } = await params;
    const result = await startFieldTask(
      await getPayloadClient(),
      user as unknown as StaffActor,
      taskId,
      getRequestIp(request),
    );
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gorev baslatilamadi." },
      { status: 400 },
    );
  }
}
