import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { getPaymentPublicUrl } from "@/lib/payments/urls";
import {
  createPaymentInitialization,
  PaymentInitializationError,
} from "@/lib/payments/service";
import { parsePaymentInitialization } from "@/lib/payments/validation";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

function getCallbackUrl(request: Request) {
  return getPaymentPublicUrl(request.url, "/api/payments/callback");
}

export async function POST(request: Request) {
  try {
    const requestBody = (await request.json()) as Record<string, unknown>;
    const body = parsePaymentInitialization({
      ...requestBody,
      donorName: requestBody.donor_name || requestBody.donorName,
      campaignId: requestBody.campaign_id || requestBody.campaignId,
      note: requestBody.donation_note || requestBody.donationNote,
    });
    const ip = getRequestIp(request);
    await enforceRateLimit({
      scope: "payment-initialize",
      identity: `${ip}:${body.email}`,
      maxRequests: 5,
      windowSeconds: 15 * 60,
    });
    const payload = await getPayloadClient();

    const result = await createPaymentInitialization(payload, {
      donorName: body.donorName,
      email: body.email,
      phone: body.phone,
      identityNumber: body.identityNumber,
      countryCode: body.countryCode,
      address: body.address,
      city: body.city,
      amount: body.amount,
      currency: body.currency,
      campaignId: body.campaignId,
      note: body.note,
      taxReceiptRequested: body.taxReceiptRequested,
      kvkkAcceptedAt: body.kvkkAccepted ? new Date().toISOString() : "",
      termsAcceptedAt: body.termsAccepted ? new Date().toISOString() : "",
      ip,
      callbackUrl: getCallbackUrl(request),
    });

    return NextResponse.json({
      success: true,
      paymentPageUrl: result.paymentPageUrl,
      checkoutFormContent: result.checkoutFormContent,
      conversationId: result.conversationId,
    });
  } catch (error) {
    const status =
      error instanceof PaymentInitializationError
        ? error.status
        : error instanceof RateLimitError
          ? error.status
          : 400;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Ödeme başlatılamadı.",
      },
      { status },
    );
  }
}
