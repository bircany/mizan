import type { Payload } from "payload";

import { logAuditEvent } from "@/lib/audit";
import { generateReceipt } from "@/lib/pdf";
import { sendDonationReceipt } from "@/lib/resend";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type FulfillmentStatus = "pending" | "processing" | "completed" | "action_required";
type ReceiptStatus = "pending" | "stored" | "failed" | "not_requested";
type ReportStatus = "pending" | "created" | "failed";
type EmailStatus = "pending" | "sent" | "failed" | "skipped";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : "Bilinmeyen teslimat hatası.";
}

async function getOrCreateFulfillment(payload: Payload, donationId: number | string) {
  const existing = await payload.find({
    collection: "donation-fulfillments",
    where: { donation: { equals: donationId } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.docs[0]) return existing.docs[0];

  try {
    return await payload.create({
      collection: "donation-fulfillments",
      data: {
        donation: donationId,
        status: "pending",
        receiptStatus: "pending",
        reportStatus: "pending",
        emailStatus: "pending",
        attemptCount: 0,
      },
      overrideAccess: true,
    });
  } catch (error) {
    // Concurrent callback/webhook runs can both try to create the unique record.
    const afterConflict = await payload.find({
      collection: "donation-fulfillments",
      where: { donation: { equals: donationId } },
      limit: 1,
      overrideAccess: true,
    });
    if (afterConflict.docs[0]) return afterConflict.docs[0];
    throw error;
  }
}

export async function fulfillPaidDonation(payload: Payload, donationId: number | string) {
  const donation = await payload.findByID({
    collection: "donations",
    id: donationId,
    depth: 0,
    overrideAccess: true,
  });

  if (donation.status !== "paid" && donation.status !== "partially_refunded") {
    return { status: "skipped" as const, reason: "Bağış teslimata uygun durumda değil." };
  }

  const fulfillment = await getOrCreateFulfillment(payload, donation.id);
  let receiptStatus = (fulfillment.receiptStatus || "pending") as ReceiptStatus;
  let reportStatus = (fulfillment.reportStatus || "pending") as ReportStatus;
  let emailStatus = (fulfillment.emailStatus || "pending") as EmailStatus;
  let emailMessageId = fulfillment.emailMessageId || undefined;
  const errors: string[] = [];

  await payload.update({
    collection: "donation-fulfillments",
    id: fulfillment.id,
    data: {
      status: "processing",
      attemptCount: Number(fulfillment.attemptCount || 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: undefined,
    },
    overrideAccess: true,
  });

  if (!donation.taxReceiptRequested) {
    receiptStatus = "not_requested";
  } else if (!donation.receiptPath) {
    try {
      const receipt = generateReceipt(
        donation.donorName,
        Number(donation.netConfirmedAmount),
        donation.currency,
        new Date(donation.createdAt).toLocaleDateString("tr-TR"),
        donation.receiptNumber,
      );
      const receiptBuffer = Buffer.from(await receipt.arrayBuffer());
      const receiptPath = `${donation.receiptNumber}.pdf`;
      const { error } = await getSupabaseServiceClient().storage.from("receipts").upload(
        receiptPath,
        receiptBuffer,
        { contentType: "application/pdf", upsert: true },
      );
      if (error) throw new Error(`Makbuz depolama hatası: ${error.message}`);

      await payload.update({
        collection: "donations",
        id: donation.id,
        data: { receiptPath },
        overrideAccess: true,
      });
      receiptStatus = "stored";
    } catch (error) {
      receiptStatus = "failed";
      errors.push(errorMessage(error));
    }
  } else {
    receiptStatus = "stored";
  }

  try {
    const reports = await payload.find({
      collection: "donor-reports",
      where: { donation: { equals: donation.id } },
      limit: 1,
      overrideAccess: true,
    });
    if (!reports.docs[0]) {
      await payload.create({
        collection: "donor-reports",
        data: {
          title: `${donation.donorName} bağış raporu`,
          donation: donation.id,
          summaryForDonor:
            "Bağışınız alındı. Saha raporu onaylandığında yeni bilgilendirme gönderilecektir.",
          status: "draft",
        },
        overrideAccess: true,
      });
    }
    reportStatus = "created";
  } catch (error) {
    reportStatus = "failed";
    errors.push(errorMessage(error));
  }

  if (donation.taxReceiptRequested && emailStatus !== "sent") {
    try {
      const result = await sendDonationReceipt(
        donation.email,
        donation.donorName,
        Number(donation.netConfirmedAmount),
        donation.currency,
        donation.receiptNumber,
      );
      if (result.status === "sent") {
        emailStatus = "sent";
        emailMessageId = result.messageId;
      } else {
        emailStatus = "skipped";
        errors.push(result.reason);
      }
    } catch (error) {
      emailStatus = "failed";
      errors.push(errorMessage(error));
    }
  }

  if (!donation.taxReceiptRequested) {
    emailStatus = "skipped";
  }

  const status: FulfillmentStatus =
    (receiptStatus === "stored" || receiptStatus === "not_requested") && reportStatus === "created" && (emailStatus === "sent" || emailStatus === "skipped")
      ? "completed"
      : "action_required";
  const lastError = errors.length ? errors.join(" | ").slice(0, 1000) : undefined;

  const updated = await payload.update({
    collection: "donation-fulfillments",
    id: fulfillment.id,
    data: {
      status,
      receiptStatus,
      reportStatus,
      emailStatus,
      emailMessageId,
      lastError,
    },
    overrideAccess: true,
  });

  await logAuditEvent(payload, {
    action: status === "completed" ? "donation.fulfillment_completed" : "donation.fulfillment_action_required",
    actorEmail: "payment-service",
    targetCollection: "donation-fulfillments",
    targetId: updated.id,
    details: {
      donationId: donation.id,
      receiptStatus,
      reportStatus,
      emailStatus,
    },
  });

  return updated;
}
