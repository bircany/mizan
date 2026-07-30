import crypto from "crypto";
import type { Payload } from "payload";

import { logAuditEvent } from "@/lib/audit";
import { getCountryName } from "@/lib/countries";
import { databaseQuery } from "@/lib/database";
import type { UnifiedDonationCheckoutInput } from "@/lib/donations/validation";
import {
  getIyzicoMaxPaymentAmount,
  initializeCheckoutForm,
  isIyzicoSandbox,
  verifyInitializeResponseSignature,
} from "@/lib/payments/iyzico";
import {
  getMaximumCardQuantity,
  isIyzicoAmountAllowed,
} from "@/lib/payments/limits";
import { resolveCardReservationMinutes } from "@/lib/payments/reservation-expiry";

type CampaignRecord = {
  id: string | number;
  title?: unknown;
  code?: string | null;
  slug?: string | null;
  currency?: string | null;
  pricingModel?: "free" | "fixed" | null;
  targetAmount?: number | null;
  collectedAmount?: number | null;
  unitPrice?: number | null;
  totalStock?: number | null;
  reservedUnits?: number | null;
  confirmedUnits?: number | null;
  participantRequired?: boolean | null;
  publishStartAt?: string | null;
  publishEndAt?: string | null;
  status?: "draft" | "active" | "closed" | "archived" | null;
  isDonationOpen?: boolean | null;
};

type ReservationResult = {
  intentId: number;
  campaignId: number;
  quantity: number;
  reservationExpiresAt: string;
  groupIds: number[];
  memberIds: number[];
};

export class UnifiedCheckoutError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 422 | 502 = 422,
  ) {
    super(message);
    this.name = "UnifiedCheckoutError";
  }
}

function generateConversationId() {
  return `mzn_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function campaignTitle(campaign: CampaignRecord) {
  if (typeof campaign.title === "string") return campaign.title;
  if (campaign.title && typeof campaign.title === "object") {
    const localized = campaign.title as Record<string, unknown>;
    return String(localized.tr || localized.en || "Bağış");
  }
  return "Bağış";
}

function assertCampaignCanAcceptDonation(
  campaign: CampaignRecord,
  now: Date,
) {
  if (
    campaign.status !== "active" ||
    campaign.isDonationOpen === false
  ) {
    throw new UnifiedCheckoutError(
      "Bu bağış kampanyası şu anda bağış kabul etmiyor.",
      409,
    );
  }
  if (
    campaign.publishStartAt &&
    new Date(campaign.publishStartAt).getTime() > now.getTime()
  ) {
    throw new UnifiedCheckoutError("Bu kampanya henüz başlamadı.", 409);
  }
  if (
    campaign.publishEndAt &&
    new Date(campaign.publishEndAt).getTime() <= now.getTime()
  ) {
    throw new UnifiedCheckoutError("Bu kampanya sona erdi.", 409);
  }
}

function computeCheckoutAmount(
  campaign: CampaignRecord,
  input: UnifiedDonationCheckoutInput,
) {
  if (campaign.pricingModel === "fixed") {
    const unitPrice = Number(campaign.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new UnifiedCheckoutError(
        "Kampanyanın sabit birim fiyatı tanımlı değil.",
        409,
      );
    }

    const totalStock = campaign.totalStock == null
      ? null
      : Number(campaign.totalStock);
    const unavailable =
      Number(campaign.reservedUnits || 0) +
      Number(campaign.confirmedUnits || 0);
    if (
      totalStock !== null &&
      (!Number.isFinite(totalStock) ||
        totalStock < input.quantity + unavailable)
    ) {
      throw new UnifiedCheckoutError(
        "Seçtiğiniz adet için yeterli stok kalmadı.",
        409,
      );
    }

    return {
      amount: Number((unitPrice * input.quantity).toFixed(2)),
      unitPrice,
      quantity: input.quantity,
    };
  }

  if (input.quantity !== 1) {
    throw new UnifiedCheckoutError(
      "Serbest tutarlı bağışlarda adet yalnızca 1 olabilir.",
    );
  }
  if (!input.amount) {
    throw new UnifiedCheckoutError("Bağış tutarını girin.");
  }

  return {
    amount: Number(input.amount.toFixed(2)),
    unitPrice: null,
    quantity: 1,
  };
}

async function findCampaign(
  payload: Payload,
  reference: string,
): Promise<CampaignRecord | null> {
  const result = await payload.find({
    collection: "campaigns",
    where: {
      or: [
        { code: { equals: reference } },
        { slug: { equals: reference } },
        ...(reference.match(/^\d+$/)
          ? [{ id: { equals: Number(reference) } }]
          : []),
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  return (result.docs[0] as CampaignRecord | undefined) || null;
}

async function reserveDonation(input: {
  intentId: number;
  campaignId: number;
  quantity: number;
  reservationExpiresAt: string;
  participantIds: number[];
}) {
  const result = await databaseQuery<{ result: ReservationResult }>(
    "select private.reserve_unified_donation($1::jsonb) as result",
    [JSON.stringify(input)],
  );
  if (!result.rows[0]?.result) {
    throw new Error("Bağış rezervasyonu oluşturulamadı.");
  }
  return result.rows[0].result;
}

async function releaseDonation(intentId: number, reason: string) {
  await databaseQuery(
    "select private.release_unified_donation_reservation($1, $2)",
    [intentId, reason],
  ).catch((error) => {
    console.error("Bağış rezervasyonu bırakılamadı.", {
      intentId,
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  });
}

export async function createUnifiedDonationCheckout(
  payload: Payload,
  input: UnifiedDonationCheckoutInput & {
    ip: string;
    callbackUrl: string;
  },
) {
  if (input.paymentMethod === "eft") {
    throw new UnifiedCheckoutError(
      "EFT/Havale bağışları çevrim içi rezervasyon oluşturmaz. Lütfen dernek ekibiyle telefon veya WhatsApp üzerinden iletişime geçin.",
      422,
    );
  }

  const campaign = await findCampaign(payload, input.campaignId);
  if (!campaign) {
    throw new UnifiedCheckoutError("Bağış kampanyası bulunamadı.", 404);
  }

  const now = new Date();
  assertCampaignCanAcceptDonation(campaign, now);
  const pricing = computeCheckoutAmount(campaign, input);

  if (input.paymentMethod === "card") {
    const maximum = getIyzicoMaxPaymentAmount();
    if (!isIyzicoAmountAllowed(pricing.amount, maximum)) {
      const formattedMaximum = new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: String(campaign.currency || "TRY"),
        maximumFractionDigits: 2,
      }).format(maximum);
      const maximumQuantity =
        pricing.unitPrice === null
          ? null
          : getMaximumCardQuantity(pricing.unitPrice, maximum);
      const quantityHint =
        maximumQuantity && maximumQuantity > 0
          ? ` Bu kampanyada kartla en fazla ${maximumQuantity} adet/hisse alınabilir.`
          : "";

      throw new UnifiedCheckoutError(
        `Kartla tek işlem tutarı ${formattedMaximum} değerinden küçük olmalıdır.${quantityHint} Adedi/tutarı azaltın veya EFT/Havale seçin.`,
      );
    }
  }

  if (
    campaign.pricingModel === "fixed" &&
    campaign.participantRequired &&
    input.participants.length !== pricing.quantity
  ) {
    throw new UnifiedCheckoutError(
      `Bu bağış için ${pricing.quantity} katılımcı bilgisi girilmelidir.`,
    );
  }
  if (campaign.participantRequired && !input.consents.powerOfAttorney) {
    throw new UnifiedCheckoutError(
      "Katılımcı/vekâlet onayı verilmeden bu bağış tamamlanamaz.",
    );
  }

  const currency = String(campaign.currency || "TRY");
  const conversationId = generateConversationId();
  const expiresInMinutes =
    input.paymentMethod === "card"
      ? resolveCardReservationMinutes(
          process.env.PAYMENT_CARD_RESERVATION_MINUTES,
        )
      : 24 * 60;
  const reservationExpiresAt = new Date(
    now.getTime() + expiresInMinutes * 60_000,
  ).toISOString();
  const donorName = `${input.buyer.firstName} ${input.buyer.lastName}`.trim();

  const intent = await payload.create({
    collection: "donation-intents",
    overrideAccess: true,
    data: {
      conversationId,
      donorName,
      email: input.buyer.email,
      phone: input.buyer.phone,
      address: input.buyer.address,
      city: input.buyer.city,
      countryCode: input.buyer.countryCode,
      campaign: campaign.id,
      amount: pricing.amount,
      currency,
      quantity: pricing.quantity,
      unitPriceSnapshot: pricing.unitPrice,
      paymentMethod: input.paymentMethod === "card" ? "card" : "bank_transfer",
      reservationExpiresAt,
      note: input.note,
      taxReceiptRequested: input.taxReceiptRequested,
      kvkkAcceptedAt: now.toISOString(),
      termsAcceptedAt: now.toISOString(),
      source: "unified_checkout",
      status: "draft",
    } as never,
  });

  const participantIds: number[] = [];
  try {
    for (const [index, participant] of input.participants.entries()) {
      const created = await payload.create({
        collection: "donation-participants",
        overrideAccess: true,
        data: {
          donationIntent: intent.id,
          orderIndex: index + 1,
          name: participant.name,
          phone: participant.phone,
          effectivePhone: participant.phone || input.buyer.phone,
          isPayer: participant.useBuyerIdentity,
          contactConsent:
            participant.useBuyerIdentity || input.consents.thirdPartyContact,
          proxyConsent: input.consents.powerOfAttorney,
        },
      });
      participantIds.push(Number(created.id));
    }

    const reservation = await reserveDonation({
      intentId: Number(intent.id),
      campaignId: Number(campaign.id),
      quantity: pricing.quantity,
      reservationExpiresAt,
      participantIds,
    });

    const callback = new URL(input.callbackUrl);
    if (!isIyzicoSandbox() && callback.protocol !== "https:") {
      throw new UnifiedCheckoutError(
        "Canlı kart ödemesi için HTTPS callback adresi gereklidir.",
        502,
      );
    }
    const checkout = await initializeCheckoutForm({
      conversationId,
      basketId: `bagis-kampanya-${campaign.id}`,
      amount: pricing.amount,
      currency,
      callbackUrl: input.callbackUrl,
      donorName: input.buyer.firstName,
      donorSurname: input.buyer.lastName,
      email: input.buyer.email,
      phone: input.buyer.phone,
      identityNumber:
        input.buyer.identityNumber ||
        (isIyzicoSandbox() ? "11111111111" : ""),
      address: input.buyer.address,
      city: input.buyer.city,
      country: getCountryName(input.buyer.countryCode),
      ip: input.ip,
    });

    if (
      checkout.status !== "success" ||
      !checkout.token ||
      !verifyInitializeResponseSignature(checkout)
    ) {
      throw new UnifiedCheckoutError(
        checkout.errorMessage ||
          "Kart ödeme sayfası güvenli biçimde oluşturulamadı.",
        502,
      );
    }

    await payload.create({
      collection: "payment-sessions",
      overrideAccess: true,
      data: {
        donationIntent: intent.id,
        conversationId,
        paymentMethod: "card",
        reservationExpiresAt,
        checkoutToken: checkout.token,
        checkoutFormContent: checkout.checkoutFormContent,
        paymentPageUrl: checkout.paymentPageUrl,
        providerStatus: "INIT",
        rawResponse: checkout,
      } as never,
    });
    await payload.update({
      collection: "donation-intents",
      id: intent.id,
      overrideAccess: true,
      data: { status: "payment_initialized" },
    });
    await logAuditEvent(payload, {
      action: "donation.card_initialized",
      actorEmail: input.buyer.email,
      targetCollection: "donation-intents",
      targetId: intent.id,
      details: {
        campaignId: campaign.id,
        amount: pricing.amount,
        currency,
        quantity: pricing.quantity,
        reservationExpiresAt,
      },
      ipAddress: input.ip,
    });

    return {
      state: "card_initialized" as const,
      intentId: intent.id,
      conversationId,
      token: checkout.token,
      checkoutFormContent: checkout.checkoutFormContent,
      paymentPageUrl: checkout.paymentPageUrl,
      amount: pricing.amount,
      currency,
      reservationExpiresAt,
    };
  } catch (error) {
    await payload
      .update({
        collection: "donation-intents",
        id: intent.id,
        overrideAccess: true,
        data: { status: "failed" },
      })
      .catch(() => undefined);
    await releaseDonation(Number(intent.id), "checkout_initialization_failed");
    throw error;
  }
}
