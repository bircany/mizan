import { NextRequest, NextResponse } from "next/server";

import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { parseContactPage } from "@/lib/inquiry-pages";
import { getPublishedPageBySlug } from "@/lib/public/pages";
import { sendContactNotification } from "@/lib/resend";
import { getManagedSitePage } from "@/lib/site-pages";
import { getPayloadClient } from "@/lib/payload";

export const runtime = "nodejs";

function text(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 32_000) {
      return NextResponse.json(
        { success: false, error: "Form verisi izin verilen boyutu aşıyor." },
        { status: 413 },
      );
    }

    await enforceRateLimit({
      identity: clientIp(request),
      maxRequests: 5,
      scope: "public-inquiry",
      windowSeconds: 10 * 60,
    });

    const body = await request.json();
    if (text(body.company, 200)) {
      return NextResponse.json({ success: true });
    }

    const type = body.type === "student" ? "student" : "contact";
    const firstName = text(body.firstName, 60);
    const lastName = text(body.lastName, 60);
    const name = `${firstName} ${lastName}`.trim();
    const email = text(body.email, 160).toLowerCase();
    const phone = text(body.phone, 30);
    const subject = text(body.subject, 120);
    const program = text(body.program, 160);
    const message = text(body.message, 3000);
    const privacyConsent =
      body.privacyConsent === "on" || body.privacyConsent === true;

    if (
      firstName.length < 2 ||
      lastName.length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    ) {
      return NextResponse.json(
        { success: false, error: "Ad, soyad ve e-posta bilgilerini kontrol edin." },
        { status: 422 },
      );
    }
    if (!privacyConsent) {
      return NextResponse.json(
        { success: false, error: "KVKK bilgilendirmesi onaylanmalıdır." },
        { status: 422 },
      );
    }
    if (type === "student" && (phone.length < 7 || !program)) {
      return NextResponse.json(
        { success: false, error: "Telefon ve eğitim seçimi zorunludur." },
        { status: 422 },
      );
    }
    if (type === "contact" && (subject.length < 3 || message.length < 10)) {
      return NextResponse.json(
        { success: false, error: "Konu ve mesaj alanlarını eksiksiz doldurun." },
        { status: 422 },
      );
    }

    const details = [
      `Form türü: ${type === "student" ? "Talebe ön başvurusu" : "İletişim"}`,
      phone ? `Telefon: ${phone}` : "",
      program ? `Eğitim / birim: ${program}` : "",
      subject ? `Konu: ${subject}` : "",
      message ? `Mesaj: ${message}` : "",
    ].filter(Boolean).join("\n");
    const fallback = getManagedSitePage("iletisim");
    const contactPage = await getPublishedPageBySlug("iletisim", "tr");
    const contactContent = parseContactPage(
      contactPage?.title || fallback?.title || "İletişim",
      contactPage?.paragraphs?.length
        ? contactPage.paragraphs
        : (fallback?.content || "").split(/\n\s*\n/).filter(Boolean),
    );
    const payload = await getPayloadClient();
    const saved = await payload.create({
      collection: "contact-messages",
      overrideAccess: true,
      data: { type, name, email, phone: phone || undefined, subject: subject || undefined, program: program || undefined, message: message || undefined, privacyConsent, status: "unread" },
    });
    let emailStatus: "sent" | "failed" | "skipped" = "skipped";
    let delivery: { status: "sent" | "skipped" } = { status: "skipped" };
    try {
    delivery = await sendContactNotification(
      email,
      name,
      details,
      type === "student" ? "Talebe Ön Başvurusu" : "İletişim Formu",
      contactContent.emails[0],
    );
    emailStatus = delivery.status === "sent" ? "sent" : "skipped";
    } catch (emailError) {
      emailStatus = "failed";
      console.error("Contact notification email failed; message was saved.", emailError);
    }
    if (false && delivery.status === "skipped") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Mesaj servisi şu anda yapılandırılmamış. Lütfen telefon veya WhatsApp üzerinden bize ulaşın.",
        },
        { status: 503 },
      );
    }

    await payload.update({ collection: "contact-messages", id: saved.id, overrideAccess: true, data: { emailNotificationStatus: emailStatus } });
    return NextResponse.json({ success: true, messageId: saved.id });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("İletişim formu gönderilemedi.", error);
    return NextResponse.json(
      {
        success: false,
        error: "Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.",
      },
      { status: 500 },
    );
  }
}
