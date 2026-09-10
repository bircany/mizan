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
  if (session.eftProofBucket !== "eft-proofs" || !session.eftProofPath) {
    return NextResponse.json({ error: "Dekont bulunamadı." }, { status: 404 });
  }
  const storage = getSupabaseServiceClient();
  const bucket = await storage.storage.getBucket("eft-proofs");
  if (bucket.error || !bucket.data || bucket.data.public) return NextResponse.json({error:"Özel dekont depolamasına erişilemiyor."},{status:503,headers:{"Cache-Control":"private, no-store"}});
  const { data, error } = await storage
    .storage.from(session.eftProofBucket)
    .createSignedUrl(session.eftProofPath, 60, {download:true});
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Dekont bağlantısı oluşturulamadı." },
      { status: 500 },
    );
  }
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
