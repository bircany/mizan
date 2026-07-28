import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/data";
import { getLatestUnreadContactMessage } from "@/lib/admin/contact-message-data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminUser(PANEL_ROUTE_ACCESS.contactMessages);
  return NextResponse.json({ message: await getLatestUnreadContactMessage() }, { headers: { "Cache-Control": "no-store" } });
}
