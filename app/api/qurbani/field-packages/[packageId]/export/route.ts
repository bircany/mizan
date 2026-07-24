import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";
import {
  generateQurbaniFieldPackageExcel,
  generateQurbaniFieldPackagePdf,
  type QurbaniFieldAnimal,
} from "@/lib/qurbani/field-exports";
import { issueQurbaniFieldToken } from "@/lib/qurbani/field-token";

const relationId = (value: unknown) =>
  typeof value === "object" && value && "id" in value
    ? String((value as { id: string | number }).id)
    : String(value || "");

const relationText = (value: unknown, key: "name" | "title" | "code", fallback: string) =>
  typeof value === "object" && value && key in value
    ? String((value as Record<string, unknown>)[key] || fallback)
    : fallback;

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "saha-listesi";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ packageId: string }> },
) {
  const user = await getAdminSession();
  if (!user?.id || !["super_admin", "field_operator"].includes(user.role)) {
    return NextResponse.json({ error: "Bu saha çıktısını indirme yetkiniz yok." }, { status: 403 });
  }
  const { packageId } = await params;
  const payload = await getPayloadClient();
  const fieldPackage = await payload.findByID({
    collection: "qurbani-field-packages",
    id: packageId,
    depth: 2,
    overrideAccess: true,
  }).catch(() => null);
  if (!fieldPackage) return NextResponse.json({ error: "Saha paketi bulunamadı." }, { status: 404 });
  if (user.role === "field_operator" && relationId(fieldPackage.assignedTo) !== String(user.id)) {
    return NextResponse.json({ error: "Bu saha paketi size atanmadı." }, { status: 403 });
  }

  const items = await payload.find({
    collection: "qurbani-field-package-items",
    where: { fieldPackage: { equals: fieldPackage.id } },
    pagination: false,
    sort: "ordinal",
    depth: 2,
    overrideAccess: true,
  });
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const animals: QurbaniFieldAnimal[] = [];
  for (const item of items.docs) {
    const poolId = relationId(item.pool);
    const pool = typeof item.pool === "object" && item.pool
      ? item.pool
      : await payload.findByID({ collection: "qurbani-pools", id: poolId, depth: 2, overrideAccess: true });
    const taskId = relationId(item.fieldTask || pool.fieldTask);
    if (!pool.code || !taskId) continue;
    const shares = await payload.find({
      collection: "qurbani-shares",
      where: { and: [{ pool: { equals: pool.id } }, { status: { equals: "confirmed" } }] },
      pagination: false,
      sort: "sequence",
      depth: 0,
      overrideAccess: true,
    });
    const grouped = new Map<string, { ownerName: string; phone: string; shareCount: number }>();
    for (const share of shares.docs) {
      const ownerName = String(share.ownerName || "İsimsiz hissedar");
      const phone = String(share.effectivePhone || "");
      const key = `${ownerName}\u0000${phone}`;
      const current = grouped.get(key);
      grouped.set(key, { ownerName, phone, shareCount: (current?.shareCount || 0) + 1 });
    }
    const token = issueQurbaniFieldToken({ packageId: String(fieldPackage.id), poolId, taskId });
    animals.push({
      code: String(pool.code),
      kindLabel: relationText(pool.product, "title", "Kurban"),
      uploadUrl: `${baseUrl}/panel/kurban/yukle?pool=${encodeURIComponent(poolId)}&token=${encodeURIComponent(token)}`,
      shares: [...grouped.values()],
    });
  }

  const preparedAt = new Date();
  const exportInput = {
    packageCode: String(fieldPackage.code),
    countryName: relationText(fieldPackage.country, "name", "Kurban operasyonu"),
    operatorName: relationText(fieldPackage.assignedTo, "name", "Saha görevlisi"),
    preparedAt,
    animals,
  };
  const format = new URL(request.url).searchParams.get("format") === "excel" ? "excel" : "pdf";
  const basename = safeFilename(`${fieldPackage.code}-saha-listesi`);
  if (format === "excel") {
    const body = generateQurbaniFieldPackageExcel(exportInput);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="${basename}.xls"`,
        "content-type": "application/vnd.ms-excel; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
    });
  }
  const body = await generateQurbaniFieldPackagePdf(exportInput);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${basename}.pdf"`,
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    },
  });
}
