import type { Payload } from "payload";

import { logAuditEvent } from "@/lib/audit";
import { databaseQuery } from "@/lib/database";
import { closeCampaignAtTarget } from "@/lib/donations/campaign-state";
import {
  retrieveCheckoutForm,
  verifyResponseSignature,
  verifyWebhookSignature,
} from "@/lib/payments/iyzico";
import { fulfillPaidDonation } from "@/lib/payments/fulfillment";
import { recordPaymentLedgerEntry } from "@/lib/payments/ledger";
import { isPaymentReservationExpired } from "@/lib/payments/reservation-expiry";

function getReceiptNumber() {
  return `MIZ-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function relationId(value: unknown) {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    return (value as { id: number | string }).id;
  }
  throw new Error("İlişkili kayıt kimliği bulunamadı.");
}

async function confirmReservation(input: {
  intentId: number;
  donationId: number;
  actor: string;
}) {
  await databaseQuery(
    "select private.confirm_unified_donation($1, $2, $3)",
    [input.intentId, input.donationId, input.actor],
  );
}

async function releaseReservation(intentId: number, reason: string) {
  await databaseQuery(
    "select private.release_unified_donation_reservation($1, $2)",
    [intentId, reason],
  ).catch((error) => {
    console.error("Başarısız ödeme rezervasyonu bırakılamadı.", {
      intentId,
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  });
}

async function completePaidDonation(
  payload: Payload,
  input: {
    intentId: number;
    donation: {
      id: number | string;
      netConfirmedAmount: number;
      currency: "TRY" | "USD" | "EUR" | "GBP";
      paymentId: string;
    };
    campaignId: number;
    source: "callback" | "webhook";
  },
) {
  try {
    await confirmReservation({
      intentId: input.intentId,
      donationId: Number(input.donation.id),
      actor: `iyzico:${input.source}`,
    });
    await recordPaymentLedgerEntry({
      donationId: Number(input.donation.id),
      campaignId: input.campaignId,
      entryType: "capture",
      amount: Number(input.donation.netConfirmedAmount),
      currency: input.donation.currency,
      providerReference: input.donation.paymentId,
      idempotencyKey: `capture:${input.donation.paymentId}`,
    });
    await closeCampaignAtTarget(input.campaignId);
    await fulfillPaidDonation(payload, input.donation.id);
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bilinmeyen ödeme kesinleştirme hatası";
    console.error("Başarılı ödeme operasyon kayıtlarına yansıtılamadı.", {
      donationId: input.donation.id,
      intentId: input.intentId,
      message,
    });
    await logAuditEvent(payload, {
      action: "payment.reconciliation_required",
      actorEmail: `iyzico:${input.source}`,
      targetCollection: "donations",
      targetId: input.donation.id,
      details: {
        campaignId: input.campaignId,
        intentId: input.intentId,
        paymentId: input.donation.paymentId,
        error: message.slice(0, 1000),
      },
    }).catch(() => undefined);
    return false;
  }
}

export async function confirmCheckoutToken(
  payload: Payload,
  token: string,
  source: "callback" | "webhook",
) {
  const sessions = await payload.find({
    collection: "payment-sessions",
    where: { checkoutToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const session = sessions.docs[0];
  if (!session) throw new Error("Ödeme oturumu bulunamadı.");

  const paymentResult = await retrieveCheckoutForm(
    token,
    session.conversationId,
  );
  const signatureVerified = verifyResponseSignature(paymentResult);

  await payload.create({
    collection: "payment-events",
    overrideAccess: true,
    data: {
      eventType: `${source}_retrieve`,
      referenceId: session.conversationId,
      payload: paymentResult,
      signatureVerified,
      processedAt: new Date().toISOString(),
      paymentSession: session.id,
    },
  });
  await payload.update({
    collection: "payment-sessions",
    id: session.id,
    overrideAccess: true,
    data: {
      providerStatus: paymentResult.status,
      fraudStatus: paymentResult.fraudStatus,
      paymentId: paymentResult.paymentId,
      lastFourDigits: paymentResult.lastFourDigits,
      cardAssociation: paymentResult.cardAssociation,
      rawResponse: paymentResult,
    },
  });

  if (
    !signatureVerified ||
    paymentResult.conversationId !== session.conversationId
  ) {
    throw new Error(
      "Ödeme sonucu imza veya conversationId doğrulamasından geçemedi.",
    );
  }

  const intentId = Number(relationId(session.donationIntent));
  const intent = await payload.findByID({
    collection: "donation-intents",
    id: intentId,
    depth: 0,
    overrideAccess: true,
  });
  const campaignId = Number(relationId(intent.campaign));

  if (paymentResult.basketId !== `bagis-kampanya-${campaignId}`) {
    throw new Error("Ödeme sonucu kampanya bilgisiyle eşleşmiyor.");
  }

  if (
    paymentResult.status !== "success" ||
    paymentResult.paymentStatus !== "SUCCESS" ||
    !paymentResult.paymentId
  ) {
    await releaseReservation(intentId, "provider_payment_failed");
    return {
      state: "failed" as const,
      reason: paymentResult.errorMessage || "Ödeme başarısız.",
    };
  }

  const reservationExpired = isPaymentReservationExpired({
    status: intent.status,
    reservationExpiresAt: intent.reservationExpiresAt,
  });
  if (reservationExpired) {
    await releaseReservation(intentId, "expired");
    await payload.update({
      collection: "payment-sessions",
      id: session.id,
      overrideAccess: true,
      data: { providerStatus: "LATE_SUCCESS_REVIEW_REQUIRED" },
    });
  } else {
    await payload.update({
      collection: "donation-intents",
      id: intent.id,
      overrideAccess: true,
      data: { status: "callback_received" },
    });
  }

  const existing = await payload.find({
    collection: "donations",
    where: { paymentId: { equals: paymentResult.paymentId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs[0]) {
    const donation = existing.docs[0];
    const isPaid =
      !reservationExpired &&
      (donation.status === "paid" ||
        donation.status === "partially_refunded");
    const reconciliationCompleted = isPaid
      ? await completePaidDonation(payload, {
          intentId,
          campaignId,
          source,
          donation: {
            id: donation.id,
            netConfirmedAmount: donation.netConfirmedAmount,
            currency: donation.currency,
            paymentId: donation.paymentId,
          },
        })
      : false;
    return {
      state: isPaid && reconciliationCompleted
        ? ("paid" as const)
        : ("pending_review" as const),
      donation,
    };
  }

  const fraudStatus = Number(paymentResult.fraudStatus ?? 0);
  const donationStatus =
    !reservationExpired && fraudStatus === 1 ? "paid" : "pending_review";
  const donation = await payload.create({
    collection: "donations",
    overrideAccess: true,
    data: {
      donorName: intent.donorName,
      email: intent.email,
      phone: intent.phone,
      campaign: campaignId,
      donationIntent: intent.id,
      quantity: Number(intent.quantity || 1),
      unitPriceSnapshot: intent.unitPriceSnapshot ?? undefined,
      paymentMethod: intent.paymentMethod || "card",
      confirmedAt:
        donationStatus === "paid" ? new Date().toISOString() : undefined,
      grossAmount: Number(paymentResult.price || intent.amount),
      netConfirmedAmount: Number(paymentResult.paidPrice || intent.amount),
      currency: paymentResult.currency || intent.currency,
      status: donationStatus,
      paymentId: paymentResult.paymentId,
      paymentSession: session.id,
      receiptNumber: getReceiptNumber(),
      taxReceiptRequested: Boolean(intent.taxReceiptRequested),
      donationNote: intent.note,
    },
  });

  await logAuditEvent(payload, {
    action: "payment.verified",
    actorEmail: "iyzico",
    targetCollection: "donations",
    targetId: donation.id,
    details: {
      campaignId,
      paymentId: donation.paymentId,
      status: donation.status,
      fraudStatus,
      source,
      reservationExpired,
    },
  });

  const reconciliationCompleted =
    donationStatus === "paid"
      ? await completePaidDonation(payload, {
          intentId,
          campaignId,
          source,
          donation: {
            id: donation.id,
            netConfirmedAmount: donation.netConfirmedAmount,
            currency: donation.currency,
            paymentId: donation.paymentId,
          },
        })
      : false;

  return {
    state:
      donationStatus === "paid" && !reconciliationCompleted
        ? ("pending_review" as const)
        : donationStatus,
    donation,
  };
}

export async function processWebhookNotification(
  payload: Payload,
  rawBody: Record<string, unknown>,
  signatureHeader: string | null,
) {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    throw new Error("Webhook imzası doğrulanamadı.");
  }

  const token = String(rawBody.token || "");
  const conversationId = String(rawBody.paymentConversationId || "");
  const sessions = await payload.find({
    collection: "payment-sessions",
    where: {
      or: [
        { checkoutToken: { equals: token } },
        { conversationId: { equals: conversationId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const session = sessions.docs[0];
  if (!session) throw new Error("Ödeme oturumu bulunamadı.");

  await payload.create({
    collection: "payment-events",
    overrideAccess: true,
    data: {
      eventType: String(rawBody.iyziEventType || "webhook"),
      referenceId: String(
        rawBody.iyziReferenceCode || conversationId || token || "unknown",
      ),
      payload: rawBody,
      headers: { "x-iyz-signature-v3": signatureHeader },
      signatureVerified: true,
      processedAt: new Date().toISOString(),
      paymentSession: session.id,
    },
  });

  return token
    ? confirmCheckoutToken(payload, token, "webhook")
    : { state: "accepted" as const };
}
