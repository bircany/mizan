import type { Payload } from "payload";

import { logAuditEvent } from "@/lib/audit";
import { databaseQuery } from "@/lib/database";
import { closeCampaignAtTarget } from "@/lib/donations/campaign-state";
import { fulfillPaidDonation } from "@/lib/payments/fulfillment";
import { recordPaymentLedgerEntry } from "@/lib/payments/ledger";

function receiptNumber() {
  return `MIZ-EFT-${Date.now().toString(36).toUpperCase()}`;
}

export async function reviewEftDonation(
  payload: Payload,
  input: {
    sessionId: string | number;
    decision: "approve" | "reject";
    description: string;
    actorId: string | number;
    actorEmail: string;
    ip: string;
  },
) {
  const session = await payload.findByID({
    collection: "payment-sessions",
    id: input.sessionId,
    depth: 1,
    overrideAccess: true,
  });
  const intentId =
    typeof session.donationIntent === "object"
      ? session.donationIntent.id
      : session.donationIntent;
  const intent = await payload.findByID({
    collection: "donation-intents",
    id: intentId,
    depth: 0,
    overrideAccess: true,
  });

  if (
    session.paymentMethod !== "bank_transfer" ||
    !session.eftProofPath ||
    String(session.providerStatus) !== "EFT_REVIEW_PENDING"
  ) {
    throw new Error("Bu ödeme EFT incelemesine uygun değil.");
  }
  if (!input.description.trim()) {
    throw new Error("EFT inceleme açıklaması zorunludur.");
  }

  const campaignId =
    typeof intent.campaign === "object" ? intent.campaign.id : intent.campaign;
  const paymentId = `EFT-${intent.conversationId}`;

  if (input.decision === "reject") {
    if (session.providerStatus === "EFT_APPROVED") {
      throw new Error("Onaylanmış EFT kaydı reddedilemez.");
    }
    await databaseQuery(
      "select private.release_unified_donation_reservation($1, $2)",
      [Number(intent.id), "eft_rejected"],
    );
    await payload.update({
      collection: "payment-sessions",
      id: session.id,
      overrideAccess: true,
      data: {
        providerStatus: "EFT_REJECTED",
        eftReviewStatus: "rejected",
        eftReviewedAt: new Date().toISOString(),
        eftReviewedBy: input.actorId,
      },
    });
    await payload.update({
      collection: "donation-intents",
      id: intent.id,
      overrideAccess: true,
      data: { status: "failed" },
    });
    await logAuditEvent(payload, {
      action: "donation.eft_rejected",
      actorEmail: input.actorEmail,
      targetCollection: "donation-intents",
      targetId: intent.id,
      details: {
        sessionId: session.id,
        description: input.description,
      },
      ipAddress: input.ip,
    });
    return { state: "rejected" as const };
  }

  const existing = await payload.find({
    collection: "donations",
    where: { paymentId: { equals: paymentId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const donation =
    existing.docs[0] ||
    (await payload.create({
      collection: "donations",
      overrideAccess: true,
      data: {
        donationIntent: intent.id,
        donorName: intent.donorName,
        email: intent.email,
        phone: intent.phone,
        campaign: campaignId,
        grossAmount: Number(intent.amount),
        netConfirmedAmount: Number(intent.amount),
        currency: intent.currency,
        quantity: Number(intent.quantity || 1),
        unitPriceSnapshot: intent.unitPriceSnapshot,
        paymentMethod: "bank_transfer",
        confirmedAt: new Date().toISOString(),
        status: "paid",
        paymentId,
        receiptNumber: receiptNumber(),
        paymentSession: session.id,
        taxReceiptRequested: Boolean(intent.taxReceiptRequested),
        donationNote: intent.note,
      } as never,
    }));

  await databaseQuery(
    "select private.confirm_unified_donation($1, $2, $3)",
    [Number(intent.id), Number(donation.id), `eft:${input.actorId}`],
  );
  await recordPaymentLedgerEntry({
    donationId: Number(donation.id),
    campaignId: Number(campaignId),
    entryType: "capture",
    amount: Number(donation.netConfirmedAmount),
    currency: donation.currency,
    providerReference: paymentId,
    idempotencyKey: `capture:${paymentId}`,
    metadata: {
      paymentMethod: "bank_transfer",
      reviewedBy: input.actorId,
    },
  });
  await closeCampaignAtTarget(Number(campaignId));
  await payload.update({
    collection: "donation-intents",
    id: intent.id,
    overrideAccess: true,
    data: { status: "completed" },
  });
  await payload.update({
    collection: "payment-sessions",
    id: session.id,
    overrideAccess: true,
    data: {
      providerStatus: "EFT_APPROVED",
      paymentId,
      eftReviewStatus: "approved",
      eftReviewedAt: new Date().toISOString(),
      eftReviewedBy: input.actorId,
    },
  });
  await fulfillPaidDonation(payload, donation.id);
  await logAuditEvent(payload, {
    action: "donation.eft_approved",
    actorEmail: input.actorEmail,
    targetCollection: "donations",
    targetId: donation.id,
    details: {
      intentId: intent.id,
      sessionId: session.id,
      amount: donation.netConfirmedAmount,
      currency: donation.currency,
      description: input.description,
    },
    ipAddress: input.ip,
  });

  return { state: "paid" as const, donationId: donation.id };
}
