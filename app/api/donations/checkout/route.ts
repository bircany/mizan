import { NextResponse } from "next/server";

import {
  createUnifiedDonationCheckout,
  UnifiedCheckoutError,
} from "@/lib/donations/checkout";
import { parseUnifiedDonationCheckout } from "@/lib/donations/validation";
import { getPayloadClient } from "@/lib/payload";
import { getPaymentPublicUrl } from "@/lib/payments/urls";
import {
  areCardPaymentsEnabled,
  CARD_PAYMENTS_UNAVAILABLE_MESSAGE,
} from "@/lib/payments/card-payments";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  try {
    const body = parseUnifiedDonationCheckout(await request.json());
    if (body.paymentMethod === "card" && !areCardPaymentsEnabled()) {
      throw new UnifiedCheckoutError(CARD_PAYMENTS_UNAVAILABLE_MESSAGE, 409);
    }
    const ip = requestIp(request);
    await enforceRateLimit({
      scope: "unified-donation-checkout",
      identity: `${ip}:${body.buyer.email}`,
      maxRequests: 5,
      windowSeconds: 15 * 60,
    });

    const payload = await getPayloadClient();
    if (body.childDonationPackages) {
      const settingsResult = await payload.find({ collection: "child-donation-settings" as never, limit: 1, depth: 0, pagination: false, overrideAccess: true }) as unknown as { docs: Array<Record<string, unknown>> };
      const settings = settingsResult.docs[0];
      if (!settings) throw new UnifiedCheckoutError("Ahmet'e destek ayarları henüz tamamlanmadı.", 409);
      const currency = body.childDonationCurrency;
      if (!currency) throw new UnifiedCheckoutError("Ahmet'e destek para birimi geçersiz.", 422);
      const campaignValue = currency === "TRY" ? settings.campaign : currency === "USD" ? settings.usdCampaign : settings.eurCampaign;
      const campaign = typeof campaignValue === "object" && campaignValue && "id" in campaignValue
        ? String((campaignValue as { id: string | number }).id)
        : String(campaignValue || "");
      if (!campaign || campaign !== body.campaignId) throw new UnifiedCheckoutError("Ahmet'e destek kampanyası doğrulanamadı.", 409);
      const suffix = currency === "TRY" ? "" : currency === "USD" ? "Usd" : "Eur";
      const prices: Record<string, number> = { food: Number(settings[`food${suffix}Price`]), stationery: Number(settings[`stationery${suffix}Price`]), toy: Number(settings[`toy${suffix}Price`]), clothing: Number(settings[`clothing${suffix}Price`]) };
      const selected = body.childDonationPackages;
      const amount = Object.entries(selected).reduce((sum, [key, quantity]) => sum + (prices[key] || 0) * Number(quantity), 0);
      if (!Number.isFinite(amount) || amount <= 0 || body.quantity !== 1) throw new UnifiedCheckoutError("Ahmet'e destek seçimi geçersiz.", 422);
      body.amount = amount;
      body.note = [body.note, `Ahmet'e destek (${currency}): ${Object.entries(selected).map(([key, quantity]) => `${key} x${quantity}`).join(", ")}`].filter(Boolean).join(" | ");
    }
    const result = await createUnifiedDonationCheckout(payload, {
      ...body,
      ip,
      callbackUrl: getPaymentPublicUrl(
        request.url,
        "/api/payments/callback",
      ),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const status =
      error instanceof UnifiedCheckoutError
        ? error.status
        : error instanceof RateLimitError
          ? error.status
          : 400;
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Bağış işlemi başlatılamadı.",
      },
      { status },
    );
  }
}
