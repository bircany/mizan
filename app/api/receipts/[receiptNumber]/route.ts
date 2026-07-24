import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ receiptNumber: string }> }) {
  const token = new URL(request.url).searchParams.get("token");
  const { receiptNumber } = await params;

  if (!token || !receiptNumber) {
    return NextResponse.json({ error: "Makbuz erişim bilgisi geçersiz." }, { status: 400 });
  }

  const payload = await getPayloadClient();
  const sessions = await payload.find({
    collection: "payment-sessions",
    where: { checkoutToken: { equals: token } },
    limit: 1,
    overrideAccess: true,
  });
  const session = sessions.docs[0];

  if (!session) return NextResponse.json({ error: "Makbuz erişim bilgisi geçersiz." }, { status: 403 });

  const donations = await payload.find({
    collection: "donations",
    where: {
      and: [
        { paymentSession: { equals: session.id } },
        { receiptNumber: { equals: receiptNumber } },
        { taxReceiptRequested: { equals: true } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const donation = donations.docs[0];

  if (!donation || !donation.receiptPath || donation.status !== "paid") {
    return NextResponse.json({ error: "Makbuz henüz indirilmeye hazır değil." }, { status: 404 });
  }

  const signed = await getSupabaseServiceClient().storage
    .from("receipts")
    .createSignedUrl(donation.receiptPath, 60);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: "Makbuz bağlantısı oluşturulamadı." }, { status: 502 });
  }

  return NextResponse.redirect(signed.data.signedUrl, { headers: { "Cache-Control": "no-store" }, status: 302 });
}
