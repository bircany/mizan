import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { createPaymentInitialization, PaymentInitializationError } from "@/lib/payments/service";
import { getPaymentPublicUrl } from "@/lib/payments/urls";
import { linkQurbaniPaymentIntent, reserveQurbaniOrder } from "@/lib/qurbani/orders";
import { createQurbaniOrderAuthorization } from "@/lib/qurbani/order-authorization";
import { parseCreateQurbaniOrder } from "@/lib/qurbani/validation";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const relationId = (value: unknown) => typeof value === "object" && value && "id" in value ? (value as { id: number | string }).id : value as number | string;
const requestIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";

export async function POST(request: Request) {
  try {
    const input = parseCreateQurbaniOrder(await request.json());
    const ip = requestIp(request);
    await enforceRateLimit({ scope: "qurbani-order", identity: `${ip}:${input.buyer.email}`, maxRequests: 5, windowSeconds: 15 * 60 });
    const reservation = await reserveQurbaniOrder(input, ip);
    const payload = await getPayloadClient();
    const order = await payload.findByID({ collection: "qurbani-orders", id: reservation.orderId, depth: 1, overrideAccess: true });
    const product = typeof order.product === "object" && order.product ? order.product : await payload.findByID({ collection: "qurbani-products", id: relationId(order.product), depth: 1, overrideAccess: true });
    const season = typeof order.season === "object" && order.season ? order.season : await payload.findByID({ collection: "qurbani-seasons", id: relationId(order.season), depth: 0, overrideAccess: true });

    if (input.paymentMethod === "eft") {
      const response = NextResponse.json({
        ok: true,
        success: true,
        orderId: String(order.id),
        orderNumber: order.orderNumber,
        status: order.status,
        reservationExpiresAt: reservation.reservedUntil.toISOString(),
        eft: { bankName: season.bankName, accountHolder: season.accountHolder, iban: season.iban, reference: order.orderNumber },
      }, { status: 201 });
      response.cookies.set("mizan-qurbani-order", createQurbaniOrderAuthorization(order.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/qurbani/orders", maxAge: 86_400 });
      return response;
    }

    const payment = await createPaymentInitialization(payload, {
      donorName: order.buyerName,
      email: order.buyerEmail,
      phone: order.buyerPhone,
      identityNumber: order.identityNumber,
      countryCode: order.countryCode,
      address: String(order.addressSnapshot?.address || input.buyer.address),
      city: String(order.addressSnapshot?.city || input.buyer.city),
      amount: reservation.totalAmount,
      currency: reservation.currency,
      campaignId: relationId(product.fundingPool),
      note: `Kurban siparisi ${order.orderNumber} - ${order.shareCount} hisse`,
      taxReceiptRequested: input.receiptRequested,
      kvkkAcceptedAt: order.kvkkAcceptedAt,
      termsAcceptedAt: order.termsAcceptedAt,
      ip,
      callbackUrl: getPaymentPublicUrl(request.url, "/api/payments/callback"),
      qurbaniOrderId: order.id,
    });
    await linkQurbaniPaymentIntent(payload, order.id, payment.intentId);
    const response = NextResponse.json({
      ok: true,
      success: true,
      orderId: String(order.id),
      orderNumber: order.orderNumber,
      status: "payment_initialized",
      reservationExpiresAt: reservation.reservedUntil.toISOString(),
      paymentPageUrl: payment.paymentPageUrl,
      checkoutFormContent: payment.checkoutFormContent,
    }, { status: 201 });
    response.cookies.set("mizan-qurbani-order", createQurbaniOrderAuthorization(order.id, 30 * 60), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/qurbani/orders", maxAge: 30 * 60 });
    return response;
  } catch (error) {
    const status = error instanceof PaymentInitializationError ? error.status : error instanceof RateLimitError ? error.status : 400;
    return NextResponse.json({ ok: false, success: false, error: error instanceof Error ? error.message : "Kurban siparisi olusturulamadi." }, { status });
  }
}
