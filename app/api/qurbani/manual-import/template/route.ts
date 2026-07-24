import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { QURBANI_IMPORT_COLUMNS } from "@/lib/qurbani/manual-import-csv";

export async function GET() {
  const user = await getAdminSession();
  if (!user?.id || user.role !== "super_admin")
    return NextResponse.json({ error: "Yetkisiz işlem." }, { status: 403 });
  const example = [
    "GRUP-001",
    "123",
    "Hissedar Adı",
    "905551112233",
    "Alıcı Adı",
    "905551112233",
    "BANKA-REF-001",
    "written",
    new Date().toISOString(),
  ];
  const csv = `\uFEFF${QURBANI_IMPORT_COLUMNS.join(";")}\r\n${example.join(";")}\r\n`;
  return new NextResponse(csv, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": 'attachment; filename="kurban-manuel-kayit-sablonu.csv"',
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
