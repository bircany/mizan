import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const session = await (await getPayloadClient()).findByID({
    collection: "payment-sessions",
    id: (await context.params).sessionId,
    depth: 0,
    overrideAccess: true,
  });
  if (!session.eftProofBucket || !session.eftProofPath) {
    return NextResponse.json({ error: "Dekont bulunamadı." }, { status: 404 });
  }
  const { data, error } = await getSupabaseServiceClient()
    .storage.from(session.eftProofBucket)
    .createSignedUrl(session.eftProofPath, 300);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Dekont bağlantısı oluşturulamadı." },
      { status: 500 },
    );
  }
  return NextResponse.redirect(data.signedUrl);
}
