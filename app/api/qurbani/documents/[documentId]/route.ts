import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";
import { streamQurbaniDocument } from "@/lib/qurbani/document-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  const payload = await getPayloadClient();
  const document = await payload.findByID({ collection: "qurbani-documents", id: documentId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!document || document.status !== "active") return new NextResponse(null, { status: 404 });
  if (!document.isPublic) {
    const user = await getAdminSession();
    if (!user?.id || user.role !== "super_admin") return new NextResponse(null, { status: 404 });
  }
  try {
    const file = await streamQurbaniDocument(document.storageKey);
    return new NextResponse(file.body, {
      headers: {
        "cache-control": document.isPublic ? "public, max-age=300" : "private, no-store",
        "content-disposition": `${document.isPublic ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        "content-length": String(file.size),
        "content-type": document.mimeType,
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const user = await getAdminSession();
  if (!user?.id || user.role !== "super_admin")
    return NextResponse.json({ error: "Yetkisiz işlem." }, { status: 403 });

  const { documentId } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason)
    return NextResponse.json(
      { error: "Arşivleme nedeni zorunludur." },
      { status: 400 },
    );

  const payload = await getPayloadClient();
  const document = await payload
    .findByID({
      collection: "qurbani-documents",
      id: documentId,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null);
  if (!document)
    return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });

  await payload.update({
    collection: "qurbani-documents",
    id: documentId,
    overrideAccess: true,
    data: {
      status: "archived",
      archivedAt: new Date().toISOString(),
      archivedBy: user.id,
      archiveReason: reason,
    },
  });
  return NextResponse.json({ success: true });
}
