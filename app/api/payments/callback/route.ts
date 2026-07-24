import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { confirmCheckoutToken } from "@/lib/payments/service";
import { getPaymentPublicUrl } from "@/lib/payments/urls";

async function readToken(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    return String(formData.get("token") || "");
  }

  const body = await request.json().catch(() => null);
  return String(body?.token || "");
}

function getResultUrl(request: Request, qurbani = false) {
  return new URL(getPaymentPublicUrl(request.url, qurbani ? "/kurban/sonuc" : "/odeme/sonuc"));
}

async function handleCallback(request: Request, token: string) {
  try {
    if (!token) {
      const redirectUrl = getResultUrl(request);
      redirectUrl.searchParams.set("status", "failed");
      redirectUrl.searchParams.set(
        "message",
        "Ödeme sonucu alınamadı. Lütfen tekrar deneyin.",
      );
      return NextResponse.redirect(redirectUrl, 303);
    }

    const payload = await getPayloadClient();
    const result = await confirmCheckoutToken(payload, token, "callback");
    let qurbaniOrder: any = null;
    let qurbaniCheckout: any = null;
    if ("donation" in result && result.donation?.qurbaniOrder) {
      const orderId = typeof result.donation.qurbaniOrder === "object" ? result.donation.qurbaniOrder.id : result.donation.qurbaniOrder;
      qurbaniOrder = await payload.findByID({ collection: "qurbani-orders", id: orderId, depth: 0, overrideAccess: true }).catch(() => null);
    }
    if ("qurbaniCheckoutId" in result && result.qurbaniCheckoutId) {
      qurbaniCheckout = await payload.findByID({ collection: "qurbani-checkouts" as never, id: result.qurbaniCheckoutId as never, depth: 0, overrideAccess: true }).catch(() => null);
    }
    const redirectUrl = getResultUrl(request, Boolean(qurbaniOrder || qurbaniCheckout));

    redirectUrl.searchParams.set("status", result.state);
    redirectUrl.searchParams.set("token", token);
    if ("donation" in result && result.donation?.receiptNumber) {
      redirectUrl.searchParams.set("receipt", result.donation.receiptNumber);
      if (result.donation.taxReceiptRequested) {
        redirectUrl.searchParams.set("receiptRequested", "1");
      }
    }
    if (qurbaniOrder) {
      redirectUrl.searchParams.set("order", qurbaniOrder.orderNumber);
      redirectUrl.searchParams.set("method", "iyzico");
      redirectUrl.searchParams.set("expires", qurbaniOrder.reservedUntil);
    }
    if (qurbaniCheckout) {
      redirectUrl.searchParams.set("order", String(qurbaniCheckout.publicId || qurbaniCheckout.id));
      redirectUrl.searchParams.set("method", "iyzico");
      if (qurbaniCheckout.expiresAt) redirectUrl.searchParams.set("expires", String(qurbaniCheckout.expiresAt));
    }

    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("iyzico callback doğrulaması başarısız oldu.", {
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });

    const redirectUrl = getResultUrl(request);
    redirectUrl.searchParams.set("status", "failed");
    redirectUrl.searchParams.set(
      "message",
      "Ödeme doğrulanamadı. Lütfen tekrar deneyin.",
    );
    return NextResponse.redirect(redirectUrl, 303);
  }
}

export async function POST(request: Request) {
  const token = await readToken(request);
  return handleCallback(request, token);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  return handleCallback(request, token);
}
