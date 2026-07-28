import type { Payload } from "payload";

import { logAuditEvent } from "@/lib/audit";
import { databaseQuery } from "@/lib/database";
import { cancelPayment, refundPayment } from "@/lib/payments/iyzico";
import { recordPaymentLedgerEntry } from "@/lib/payments/ledger";
import { sendDonationRefundNotice } from "@/lib/resend";

type FinanceActionInput = {
  action: "cancel" | "refund_full" | "refund_partial";
  donationId: string | number;
  amount?: number;
  reason: string;
  description?: string;
  evidenceBucket: string;
  evidencePath: string;
  evidenceMimeType: string;
  actorEmail?: string | null;
  actorId: string | number;
  ip: string;
};

export async function executeFinanceAction(
  payload: Payload,
  input: FinanceActionInput,
) {
  const donation = await payload.findByID({
    collection: "donations",
    id: input.donationId,
    depth: 1,
    overrideAccess: true,
  });

  if (
    !["technical_error", "wrong_transaction", "legal_obligation"].includes(
      input.reason,
    )
  ) {
    throw new Error(
      "İade nedeni yalnız teknik hata, yanlış işlem veya hukuki zorunluluk olabilir.",
    );
  }
  if (
    !input.description?.trim() ||
    !input.evidenceBucket ||
    !input.evidencePath ||
    !input.evidenceMimeType
  ) {
    throw new Error("İade açıklaması ve PDF/görsel kanıt zorunludur.");
  }

  let providerResponse: Record<string, unknown>;
  let nextStatus = donation.status;
  let nextNetAmount = donation.netConfirmedAmount;

  if (input.action === "cancel") {
    if (!["paid", "pending_review"].includes(donation.status)) {
      throw new Error("Bu bağış iptal edilemez durumdadır.");
    }
    providerResponse = await cancelPayment(donation.paymentId, input.ip);
    nextStatus = "cancelled";
    nextNetAmount = 0;
  } else {
    const paymentSession =
      typeof donation.paymentSession === "object"
        ? donation.paymentSession
        : await payload.findByID({
            collection: "payment-sessions",
            id: donation.paymentSession,
            overrideAccess: true,
          });
    const transactionId =
      paymentSession?.rawResponse?.itemTransactions?.[0]?.paymentTransactionId;
    if (!transactionId) {
      throw new Error("İade için paymentTransactionId bulunamadı.");
    }

    const refundAmount =
      input.action === "refund_full"
        ? donation.netConfirmedAmount
        : Number(input.amount || 0);
    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0 ||
      refundAmount > donation.netConfirmedAmount
    ) {
      throw new Error("İade tutarı geçersiz.");
    }
    providerResponse = await refundPayment({
      paymentTransactionId: transactionId,
      price: refundAmount,
      ip: input.ip,
    });
    nextNetAmount = Math.max(0, donation.netConfirmedAmount - refundAmount);
    nextStatus =
      nextNetAmount === 0 ? "refunded" : "partially_refunded";
  }

  if (providerResponse.status !== "success") {
    throw new Error(
      String(
        providerResponse.errorMessage ||
          "iyzico finansal işlemi başarısız oldu.",
      ),
    );
  }

  const processedAmount =
    input.action === "refund_partial"
      ? Number(input.amount)
      : donation.netConfirmedAmount;
  let manualReviewRequired = false;
  if (nextNetAmount === 0) {
    const operation = await databaseQuery<{
      result: { manualReviewRequired?: boolean };
    }>("select private.apply_unified_donation_refund($1) as result", [
      Number(donation.id),
    ]);
    manualReviewRequired =
      operation.rows[0]?.result?.manualReviewRequired === true;
  }

  const refundRequest = await payload.create({
    collection: "refund-requests",
    overrideAccess: true,
    data: {
      donation: donation.id,
      type: input.action,
      reason: input.reason,
      description: input.description,
      evidenceBucket: input.evidenceBucket,
      evidencePath: input.evidencePath,
      evidenceMimeType: input.evidenceMimeType,
      manualReviewRequired,
      amount: processedAmount,
      providerReference: String(
        providerResponse.paymentId || donation.paymentId,
      ),
      providerResponse,
      status: "completed",
      requestedBy: input.actorId,
    },
  });

  await payload.update({
    collection: "donations",
    id: donation.id,
    overrideAccess: true,
    data: {
      status: nextStatus,
      netConfirmedAmount: nextNetAmount,
    },
  });

  const campaignId =
    typeof donation.campaign === "object"
      ? donation.campaign.id
      : donation.campaign;
  await recordPaymentLedgerEntry({
    donationId: Number(donation.id),
    campaignId: Number(campaignId),
    refundRequestId: Number(refundRequest.id),
    entryType: input.action === "cancel" ? "cancel" : "refund",
    amount: Number(processedAmount),
    currency: donation.currency,
    providerReference: String(
      providerResponse.paymentId || donation.paymentId,
    ),
    idempotencyKey: `${input.action}:${refundRequest.id}`,
    removeDonor: nextNetAmount === 0,
    metadata: { action: input.action, reason: input.reason },
  });

  await logAuditEvent(payload, {
    action: `finance.${input.action}`,
    actorEmail: input.actorEmail,
    targetCollection: "donations",
    targetId: donation.id,
    details: {
      refundRequestId: refundRequest.id,
      reason: input.reason,
      amount: processedAmount,
      providerResponse,
      previousState: {
        status: donation.status,
        netConfirmedAmount: donation.netConfirmedAmount,
      },
      nextState: { status: nextStatus, netConfirmedAmount: nextNetAmount },
      evidence: {
        bucket: input.evidenceBucket,
        path: input.evidencePath,
        mimeType: input.evidenceMimeType,
      },
      manualReviewRequired,
    },
    ipAddress: input.ip,
  });

  if (input.action !== "cancel") {
    try {
      await sendDonationRefundNotice({
        email: donation.email,
        donorName: donation.donorName,
        amount: Number(processedAmount),
        currency: donation.currency,
        receiptNumber: donation.receiptNumber,
        isPartial: nextStatus === "partially_refunded",
      });
    } catch (error) {
      await logAuditEvent(payload, {
        action: "finance.refund_notice_failed",
        actorEmail: input.actorEmail,
        targetCollection: "donations",
        targetId: donation.id,
        details: {
          error:
            error instanceof Error
              ? error.message
              : "Bilinmeyen e-posta hatası.",
        },
        ipAddress: input.ip,
      });
    }
  }

  return refundRequest;
}
