import type { Payload } from "payload";

import { logAuditEvent } from "@/lib/audit";
import { getCountryName } from "@/lib/countries";
import {
  cancelPayment,
  initializeCheckoutForm,
  isIyzicoSandbox,
  refundPayment,
  retrieveCheckoutForm,
  verifyInitializeResponseSignature,
  verifyResponseSignature,
  verifyWebhookSignature,
} from "@/lib/payments/iyzico";
import { recordPaymentLedgerEntry } from "@/lib/payments/ledger";
import { fulfillPaidDonation } from "@/lib/payments/fulfillment";
import { sendDonationReceipt, sendDonationRefundNotice } from "@/lib/resend";
import { confirmQurbaniOrderPayment, failQurbaniCheckout, finalizeQurbaniCheckoutPayment } from "@/lib/qurbani/orders";

function generateConversationId() {
  return `mzn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const surname = parts.length > 1 ? parts.pop() || "" : "";

  return {
    donorName: parts.join(" ") || fullName,
    donorSurname: surname || "Bağışçı",
  };
}

function getReceiptNumber() {
  return `MIZ-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export class PaymentInitializationError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 422 | 502,
  ) {
    super(message);
    this.name = "PaymentInitializationError";
  }
}

async function findDonationCampaign(
  payload: Payload,
  campaignReference: string | number,
) {
  const reference = String(campaignReference).trim();
  const byPublicReference = await payload.find({
    collection: "campaigns",
    where: {
      or: [
        {
          code: {
            equals: reference,
          },
        },
        {
          slug: {
            equals: reference,
          },
        },
      ],
    },
    limit: 1,
    depth: 0,
  });

  if (byPublicReference.docs[0]) {
    return byPublicReference.docs[0];
  }

  if (typeof campaignReference === "number" || /^\d+$/.test(reference)) {
    try {
      return await payload.findByID({
        collection: "campaigns",
        id: campaignReference,
        depth: 0,
      });
    } catch {
      return null;
    }
  }

  return null;
}

async function findFundingPool(payload: Payload, reference: string | number) {
  try {
    const pool = await payload.findByID({ collection: "campaign-funding-pools", id: reference, depth: 1 });
    const campaign = typeof pool.campaign === "object" ? pool.campaign : await payload.findByID({ collection: "campaigns", id: pool.campaign, depth: 0 });
    return { campaign, pool };
  } catch {
    return null;
  }
}

export async function createPaymentInitialization(
  payload: Payload,
  input: {
    donorName: string;
    email: string;
    phone?: string;
    identityNumber?: string;
    countryCode: string;
    address: string;
    city: string;
    amount: number;
    currency: string;
    campaignId: string | number;
    note?: string;
    taxReceiptRequested: boolean;
    kvkkAcceptedAt: string;
    termsAcceptedAt: string;
    ip: string;
    callbackUrl: string;
    qurbaniOrderId?: string | number;
    qurbaniCheckoutId?: string | number;
  },
) {
  const funding = await findFundingPool(payload, input.campaignId);
  const campaign = funding?.campaign;
  const pool = funding?.pool;

  if (!campaign) {
    throw new PaymentInitializationError(
      "Seçilen bağış alanı bulunamadı. Lütfen sepetinizi yenileyip tekrar deneyin.",
      404,
    );
  }

  if (!pool?.isDonationOpen || !campaign.isDonationOpen) {
    throw new PaymentInitializationError(
      "Bu bağış alanı şu anda bağış kabul etmiyor.",
      409,
    );
  }

  if (pool.currency !== input.currency) {
    throw new PaymentInitializationError(
      "Bağış para birimi, bağış alanının para birimiyle eşleşmiyor.",
      422,
    );
  }

  const conversationId = generateConversationId();
  const { donorName, donorSurname } = splitName(input.donorName);
  const identityNumber = input.identityNumber ||
    (isIyzicoSandbox() ? "11111111111" : undefined);

  if (!identityNumber) {
    throw new PaymentInitializationError(
      "Canlı ödeme için T.C. Kimlik No zorunludur.",
      422,
    );
  }

  const callback = new URL(input.callbackUrl);
  if (!isIyzicoSandbox() && callback.protocol !== "https:") {
    throw new PaymentInitializationError(
      "Canlı ödeme için genel erişime açık bir HTTPS adresi gereklidir.",
      502,
    );
  }

  const intent = await payload.create({
    collection: "donation-intents",
    data: {
      conversationId,
      donorName: input.donorName,
      email: input.email,
      phone: input.phone,
      campaign: campaign.id,
      fundingPool: pool.id,
      amount: input.amount,
      currency: input.currency,
      note: input.note,
      taxReceiptRequested: input.taxReceiptRequested,
      kvkkAcceptedAt: input.kvkkAcceptedAt,
      termsAcceptedAt: input.termsAcceptedAt,
      source: "website",
      status: "draft",
      qurbaniOrder: input.qurbaniOrderId,
      qurbaniCheckout: input.qurbaniCheckoutId,
    } as never,
  });

  let checkout;
  try {
    checkout = await initializeCheckoutForm({
      conversationId,
      basketId: `bagis-havuz-${pool.id}`,
      amount: input.amount,
      currency: input.currency,
      callbackUrl: input.callbackUrl,
      donorName,
      donorSurname,
      email: input.email,
      phone: input.phone || "",
      identityNumber,
      address: input.address,
      city: input.city,
      country: getCountryName(input.countryCode),
      ip: input.ip,
    });
  } catch (error) {
    await payload.update({
      collection: "donation-intents",
      id: intent.id,
      data: {
        status: "failed",
      },
    });

    console.error("iyzico ödeme başlatma isteği başarısız oldu.", {
      campaignId: campaign.id,
      fundingPoolId: pool.id,
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });

    throw new PaymentInitializationError(
      "Ödeme altyapısı şu anda başlatılamadı. Lütfen daha sonra tekrar deneyin.",
      502,
    );
  }

  if (checkout.status !== "success" || !checkout.token) {
    await payload.update({
      collection: "donation-intents",
      id: intent.id,
      data: {
        status: "failed",
      },
    });

    console.error("iyzico ödeme formu oluşturulamadı.", {
      campaignId: campaign.id,
      error: checkout.errorMessage || "Bilinmeyen hata",
    });

    throw new PaymentInitializationError(
      "Ödeme sayfası oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
      502,
    );
  }

  if (!verifyInitializeResponseSignature(checkout)) {
    await payload.update({
      collection: "donation-intents",
      id: intent.id,
      data: {
        status: "failed",
      },
    });

    console.error("iyzico ödeme formu başlatma imzası doğrulanamadı.", {
      campaignId: campaign.id,
    });

    throw new PaymentInitializationError(
      "Ödeme altyapısı doğrulanamadı. Lütfen daha sonra tekrar deneyin.",
      502,
    );
  }

  await payload.create({
    collection: "payment-sessions",
    data: {
      donationIntent: intent.id,
      conversationId,
      checkoutToken: checkout.token,
      checkoutFormContent: checkout.checkoutFormContent,
      paymentPageUrl: checkout.paymentPageUrl,
      providerStatus: "INIT",
      rawResponse: checkout,
    },
  });

  await payload.update({
    collection: "donation-intents",
    id: intent.id,
    data: {
      status: "payment_initialized",
    },
  });

  await logAuditEvent(payload, {
    action: "payment.initialized",
    actorEmail: input.email,
    targetCollection: "donation-intents",
    targetId: intent.id,
    details: {
      campaignId: campaign.id,
      conversationId,
      amount: input.amount,
      currency: input.currency,
    },
    ipAddress: input.ip,
  });

  return {
    intentId: intent.id,
    conversationId,
    token: checkout.token,
    checkoutFormContent: checkout.checkoutFormContent,
    paymentPageUrl: checkout.paymentPageUrl,
  };
}

async function finalizePaidQurbaniCheckout(
  payload: Payload,
  input: { checkoutId: string | number; donationId: string | number; paymentId: string; source: "callback" | "webhook" },
) {
  try {
    const finalized = await finalizeQurbaniCheckoutPayment({ checkoutId: input.checkoutId, donationId: input.donationId, paymentId: input.paymentId, actor: `iyzico:${input.source}` });
    if (finalized.state === "processing") return "processing" as const;
    const orderIds = Array.isArray(finalized.orderIds)
      ? finalized.orderIds
      : Array.isArray((finalized as { order_ids?: unknown }).order_ids)
        ? (finalized as { order_ids: number[] }).order_ids
        : [];
    for (const orderId of orderIds) {
      const order = await payload.findByID({ collection: "qurbani-orders", id: orderId, depth: 2, overrideAccess: true });
      const product = typeof order.product === "object" && order.product ? order.product : null;
      const campaignId = product?.campaign && typeof product.campaign === "object" ? product.campaign.id : product?.campaign;
      const fundingPoolId = product?.fundingPool && typeof product.fundingPool === "object" ? product.fundingPool.id : product?.fundingPool;
      if (!campaignId || !fundingPoolId) throw new Error(`Kurban siparişi ${orderId} finans havuzuna bağlanamadı.`);
      await recordPaymentLedgerEntry({
        donationId: Number(input.donationId),
        campaignId: Number(campaignId),
        fundingPoolId: Number(fundingPoolId),
        entryType: "capture",
        amount: Number(order.totalAmount),
        currency: order.currency,
        providerReference: input.paymentId,
        idempotencyKey: `capture:${input.paymentId}:qurbani-order:${order.id}`,
        metadata: { qurbaniCheckoutId: input.checkoutId, qurbaniOrderId: order.id },
      });
    }
    await fulfillPaidDonation(payload, input.donationId);
    return "paid" as const;
  } catch (error) {
    console.error("Ödeme alındı ancak kurban checkout finalizer tamamlanamadı.", {
      checkoutId: input.checkoutId,
      donationId: input.donationId,
      paymentId: input.paymentId,
      error: error instanceof Error ? error.message : "Bilinmeyen finalizer hatası",
    });
    await logAuditEvent(payload, {
      action: "qurbani.checkout_finalization_pending",
      actorEmail: "iyzico",
      targetCollection: "qurbani-checkouts",
      targetId: input.checkoutId,
      details: { donationId: input.donationId, paymentId: input.paymentId, source: input.source, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
    }).catch(() => undefined);
    return "processing" as const;
  }
}

export async function confirmCheckoutToken(
  payload: Payload,
  token: string,
  source: "callback" | "webhook",
) {
  const existingSessions = await payload.find({
    collection: "payment-sessions",
    where: {
      checkoutToken: {
        equals: token,
      },
    },
    limit: 1,
  });

  const session = existingSessions.docs[0];
  if (!session) {
    throw new Error("Ödeme oturumu bulunamadı.");
  }

  const paymentResult = await retrieveCheckoutForm(token, session.conversationId);
  const signatureVerified = verifyResponseSignature(paymentResult);

  await payload.create({
    collection: "payment-events",
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
    data: {
      providerStatus: paymentResult.status,
      fraudStatus: paymentResult.fraudStatus,
      paymentId: paymentResult.paymentId,
      lastFourDigits: paymentResult.lastFourDigits,
      cardAssociation: paymentResult.cardAssociation,
      rawResponse: paymentResult,
    },
  });

  if (!signatureVerified || paymentResult.conversationId !== session.conversationId) {
    throw new Error("Ödeme sonucu imza veya conversationId doğrulamasından geçemedi.");
  }

  const intentId =
    typeof session.donationIntent === "object" ? session.donationIntent.id : session.donationIntent;
  const intent = await payload.findByID({
    collection: "donation-intents",
    id: intentId,
    depth: 1,
  });
  const qurbaniCheckoutValue = (intent as typeof intent & { qurbaniCheckout?: unknown }).qurbaniCheckout;
  const qurbaniCheckoutId = qurbaniCheckoutValue
    ? (typeof qurbaniCheckoutValue === "object" && qurbaniCheckoutValue && "id" in qurbaniCheckoutValue ? String((qurbaniCheckoutValue as { id: string | number }).id) : String(qurbaniCheckoutValue))
    : null;

  const campaignId = typeof intent.campaign === "object" ? intent.campaign.id : intent.campaign;
  const fundingPoolId = typeof intent.fundingPool === "object" ? intent.fundingPool.id : intent.fundingPool;
  if (!fundingPoolId || paymentResult.basketId !== `bagis-havuz-${fundingPoolId}`) {
    throw new Error("Ödeme sonucu bağış alanı bilgisiyle eşleşmiyor.");
  }

  if (
    paymentResult.status !== "success" ||
    paymentResult.paymentStatus !== "SUCCESS" ||
    !paymentResult.paymentId
  ) {
    await payload.update({
      collection: "donation-intents",
      id: intent.id,
      data: {
        status: "failed",
      },
    });

    if (qurbaniCheckoutId) {
      await failQurbaniCheckout(qurbaniCheckoutId, "PROVIDER_PAYMENT_FAILED").catch(() => undefined);
    }

    return {
      state: "failed" as const,
      qurbaniCheckoutId,
      reason: paymentResult.errorMessage || "Ödeme başarısız.",
    };
  }

  await payload.update({
    collection: "donation-intents",
    id: intent.id,
    data: {
      status: "callback_received",
    },
  });

  const currentDonation = await payload.find({
    collection: "donations",
    where: {
      paymentId: {
        equals: paymentResult.paymentId,
      },
    },
    limit: 1,
  });

  if (currentDonation.docs[0]) {
    const existingDonation = currentDonation.docs[0];
    let existingState: "paid" | "processing" | "pending_review" = existingDonation.status === "paid" ? "paid" : "pending_review";
    if (existingDonation.status === "paid" || existingDonation.status === "partially_refunded") {
      if (!qurbaniCheckoutId) {
      await recordPaymentLedgerEntry({
        donationId: Number(existingDonation.id),
        campaignId: Number(campaignId),
        fundingPoolId: Number(fundingPoolId),
        entryType: "capture",
        amount: Number(existingDonation.netConfirmedAmount),
        currency: existingDonation.currency,
        providerReference: existingDonation.paymentId,
        idempotencyKey: `capture:${existingDonation.paymentId}`,
      });
      await fulfillPaidDonation(payload, existingDonation.id);
      }
      const existingQurbaniOrderId = intent.qurbaniOrder
        ? (typeof intent.qurbaniOrder === "object" ? intent.qurbaniOrder.id : intent.qurbaniOrder)
        : null;
      if (existingQurbaniOrderId) {
        await confirmQurbaniOrderPayment({ orderId: existingQurbaniOrderId, donationId: existingDonation.id, providerPaymentId: existingDonation.paymentId, actor: `iyzico:${source}` });
      }
      if (qurbaniCheckoutId) {
        existingState = await finalizePaidQurbaniCheckout(payload, { checkoutId: qurbaniCheckoutId, donationId: existingDonation.id, paymentId: existingDonation.paymentId, source });
      }
    }

    return {
      state: existingState,
      donation: existingDonation,
      qurbaniCheckoutId,
    };
  }

  const receiptNumber = getReceiptNumber();
  const fraudStatus = Number(paymentResult.fraudStatus ?? 0);
  const donationStatus = fraudStatus === 1 ? "paid" : "pending_review";

  const donation = await payload.create({
    collection: "donations",
    data: {
      donorName: intent.donorName,
      email: intent.email,
      phone: intent.phone,
      campaign:
        campaignId,
      fundingPool: fundingPoolId,
      grossAmount: Number(paymentResult.price || intent.amount),
      netConfirmedAmount: Number(paymentResult.paidPrice || intent.amount),
      currency: paymentResult.currency || intent.currency,
      status: donationStatus,
      paymentId: paymentResult.paymentId,
      paymentSession: session.id,
      receiptNumber,
      taxReceiptRequested: Boolean(intent.taxReceiptRequested),
      donationNote: intent.note,
      qurbaniOrder: intent.qurbaniOrder
        ? (typeof intent.qurbaniOrder === "object" ? intent.qurbaniOrder.id : intent.qurbaniOrder)
        : undefined,
      qurbaniCheckout: qurbaniCheckoutId || undefined,
    } as never,
  });

  await payload.update({
    collection: "donation-intents",
    id: intent.id,
    data: {
      status: "completed",
    },
  });

  await logAuditEvent(payload, {
    action: "payment.verified",
    actorEmail: "iyzico",
    targetCollection: "donations",
    targetId: donation.id,
    details: {
      campaignId,
      fundingPoolId,
      paymentId: donation.paymentId,
      status: donation.status,
      fraudStatus,
      source,
    },
  });

  let finalState: "paid" | "processing" | "pending_review" = donationStatus;
  if (donationStatus === "paid") {
    if (!qurbaniCheckoutId) {
      await recordPaymentLedgerEntry({
      donationId: Number(donation.id),
      campaignId: Number(campaignId),
      fundingPoolId: Number(fundingPoolId),
      entryType: "capture",
      amount: Number(donation.netConfirmedAmount),
      currency: donation.currency,
      providerReference: donation.paymentId,
      idempotencyKey: `capture:${donation.paymentId}`,
    });

      await fulfillPaidDonation(payload, donation.id);
    }

    const qurbaniOrderId = intent.qurbaniOrder
      ? (typeof intent.qurbaniOrder === "object" ? intent.qurbaniOrder.id : intent.qurbaniOrder)
      : null;
    if (qurbaniOrderId) {
      await confirmQurbaniOrderPayment({
        orderId: qurbaniOrderId,
        donationId: donation.id,
        providerPaymentId: paymentResult.paymentId,
        actor: `iyzico:${source}`,
      });
    }
    if (qurbaniCheckoutId) {
      finalState = await finalizePaidQurbaniCheckout(payload, { checkoutId: qurbaniCheckoutId, donationId: donation.id, paymentId: paymentResult.paymentId, source });
    }
  }

  return {
    state: finalState,
    donation,
    qurbaniCheckoutId,
  };
}

export async function processWebhookNotification(
  payload: Payload,
  rawBody: Record<string, unknown>,
  signatureHeader: string | null,
) {
  const isValid = verifyWebhookSignature(rawBody, signatureHeader);
  const token = String(rawBody.token || "");
  const conversationId = String(rawBody.paymentConversationId || "");

  if (!isValid) {
    console.warn("Geçersiz imzalı iyzico webhook isteği engellendi.");
    throw new Error("Webhook imzası doğrulanamadı.");
  }

  const sessionResult = await payload.find({
    collection: "payment-sessions",
    where: {
      or: [
        {
          checkoutToken: {
            equals: token,
          },
        },
        {
          conversationId: {
            equals: conversationId,
          },
        },
      ],
    },
    limit: 1,
  });

  const session = sessionResult.docs[0];

  if (!session) {
    throw new Error("Ödeme oturumu bulunamadı.");
  }

  await payload.create({
    collection: "payment-events",
    data: {
      eventType: String(rawBody.iyziEventType || "webhook"),
      referenceId: String(rawBody.iyziReferenceCode || conversationId || token || "unknown"),
      payload: rawBody,
      headers: {
        "x-iyz-signature-v3": signatureHeader,
      },
      signatureVerified: isValid,
      processedAt: new Date().toISOString(),
      paymentSession: session?.id,
    },
  });

  if (token) {
    return confirmCheckoutToken(payload, token, "webhook");
  }

  return { state: "accepted" as const };
}

export async function executeFinanceAction(
  payload: Payload,
  input: {
    action: "cancel" | "refund_full" | "refund_partial";
    donationId: string | number;
    amount?: number;
    reason: string;
    description?: string;
    actorEmail?: string | null;
    actorId: string | number;
    ip: string;
  },
) {
  const donation = await payload.findByID({
    collection: "donations",
    id: input.donationId,
    depth: 1,
  });

  let providerResponse: Record<string, unknown>;
  let nextStatus = donation.status;
  let nextNetAmount = donation.netConfirmedAmount;

  if (input.action === "cancel") {
    if (donation.status !== "paid" && donation.status !== "pending_review") {
      throw new Error("Bu bagis iptal edilemez durumdadir.");
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
          });
    const transactionId = paymentSession?.rawResponse?.itemTransactions?.[0]?.paymentTransactionId;

    if (!transactionId) {
      throw new Error("Refund icin paymentTransactionId bulunamadi.");
    }

    const refundAmount =
      input.action === "refund_full" ? donation.netConfirmedAmount : Number(input.amount || 0);

    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > donation.netConfirmedAmount) {
      throw new Error("Iade tutari gecersiz.");
    }

    providerResponse = await refundPayment({
      paymentTransactionId: transactionId,
      price: refundAmount,
      ip: input.ip,
    });

    nextNetAmount = Math.max(0, donation.netConfirmedAmount - refundAmount);
    nextStatus = nextNetAmount === 0 ? "refunded" : "partially_refunded";

  }

  if (providerResponse.status !== "success") {
    throw new Error(String(providerResponse.errorMessage || "iyzico finansal islemi basarisiz oldu."));
  }

  const processedAmount =
    input.action === "cancel"
      ? donation.netConfirmedAmount
      : input.action === "refund_full"
        ? donation.netConfirmedAmount
        : Number(input.amount);

  const refundRequest = await payload.create({
    collection: "refund-requests",
    data: {
      donation: donation.id,
      type: input.action,
      reason: input.reason,
      description: input.description,
      amount: processedAmount,
      providerReference: String(providerResponse.paymentId || donation.paymentId),
      providerResponse,
      status: "completed",
      requestedBy: input.actorId,
    },
  });

  await payload.update({
    collection: "donations",
    id: donation.id,
    data: {
      status: nextStatus,
      netConfirmedAmount: nextNetAmount,
    },
  });

  if (donation.campaign && donation.fundingPool) {
    const campaignId =
      typeof donation.campaign === "object" ? donation.campaign.id : donation.campaign;
    const fundingPoolId =
      typeof donation.fundingPool === "object" ? donation.fundingPool.id : donation.fundingPool;
    await recordPaymentLedgerEntry({
      donationId: Number(donation.id),
      campaignId: Number(campaignId),
      fundingPoolId: Number(fundingPoolId),
      refundRequestId: Number(refundRequest.id),
      entryType: input.action === "cancel" ? "cancel" : "refund",
      amount: Number(processedAmount),
      currency: donation.currency,
      providerReference: String(providerResponse.paymentId || donation.paymentId),
      idempotencyKey: `${input.action}:${refundRequest.id}`,
      removeDonor: nextNetAmount === 0,
      metadata: {
        action: input.action,
        reason: input.reason,
      },
    });
  }

  await logAuditEvent(payload, {
    action: `finance.${input.action}`,
    actorEmail: input.actorEmail,
    targetCollection: "donations",
    targetId: donation.id,
    details: {
      refundRequestId: refundRequest.id,
      reason: input.reason,
      amount: input.amount,
      providerResponse,
    },
    ipAddress: input.ip,
  });

  if (input.action !== "cancel") {
    try {
      const delivery = await sendDonationRefundNotice({
        email: donation.email,
        donorName: donation.donorName,
        amount: Number(processedAmount),
        currency: donation.currency,
        receiptNumber: donation.receiptNumber,
        isPartial: nextStatus === "partially_refunded",
      });

      if (delivery.status === "skipped") {
        await logAuditEvent(payload, {
          action: "finance.refund_notice_skipped",
          actorEmail: input.actorEmail,
          targetCollection: "donations",
          targetId: donation.id,
          details: { reason: delivery.reason },
          ipAddress: input.ip,
        });
      }
    } catch (error) {
      await logAuditEvent(payload, {
        action: "finance.refund_notice_failed",
        actorEmail: input.actorEmail,
        targetCollection: "donations",
        targetId: donation.id,
        details: { error: error instanceof Error ? error.message : "Bilinmeyen e-posta hatasi." },
        ipAddress: input.ip,
      });
    }
  }

  return refundRequest;
}
