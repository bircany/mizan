import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { confirmCheckoutToken } from "@/lib/payments/service";
import { getPaymentPublicUrl } from "@/lib/payments/urls";

async function readToken(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return String(formData.get("token") || "");
  }

  const body = await request.json().catch(() => null);
  return String(body?.token || "");
}

function getResultUrl(request: Request) {
  return new URL(getPaymentPublicUrl(request.url, "/odeme/sonuc"));
}

export async function POST(request: Request) {
  try {
    const token = await readToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: "Token bulunamadı." }, { status: 400 });
    }

    const payload = await getPayloadClient();
    const result = await confirmCheckoutToken(payload, token, "callback");
    const redirectUrl = getResultUrl(request);

    redirectUrl.searchParams.set("status", result.state);
    redirectUrl.searchParams.set("token", token);
    if ("donation" in result && result.donation?.receiptNumber) {
      redirectUrl.searchParams.set("receipt", result.donation.receiptNumber);
    }

    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("iyzico callback doğrulaması başarısız oldu.", {
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });

    const redirectUrl = getResultUrl(request);
    redirectUrl.searchParams.set("status", "failed");
    redirectUrl.searchParams.set("message", "Ödeme doğrulanamadı. Lütfen tekrar deneyin.");
    return NextResponse.redirect(redirectUrl, 303);
  }
}
