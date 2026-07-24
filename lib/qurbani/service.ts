import "server-only";

import { createHash, randomInt, randomUUID } from "node:crypto";

import type { Payload } from "payload";

import { logAuditEvent } from "@/lib/audit";
import { fulfillPaidDonation } from "@/lib/payments/fulfillment";
import { recordPaymentLedgerEntry } from "@/lib/payments/ledger";
import { sendEvolutionText } from "@/lib/qurbani/evolution";
import { confirmQurbaniOrderPayment, transferQurbaniOrder as transferQurbaniOrderTransaction } from "@/lib/qurbani/orders";
import { issueQurbaniAccessToken } from "@/lib/qurbani/tokens";

const relationId = (value: unknown) => typeof value === "object" && value && "id" in value ? String((value as { id: number | string }).id) : String(value || "");
const normalizePhone = (value: string) => value.replace(/\D/g, "");
const phoneHash = (value: string) => createHash("sha256").update(normalizePhone(value)).digest("hex");

export async function approveQurbaniEftOrder(payload: Payload, input: { orderId: string | number; actorId: string | number; actorEmail?: string }) {
  const order = await payload.findByID({ collection: "qurbani-orders", id: input.orderId, depth: 2, overrideAccess: true });
  if (order.paymentMethod !== "eft" || !["pending_eft_review", "expired"].includes(order.status)) throw new Error("Siparis EFT onayina uygun degil.");
  if (!order.eftProofPath) throw new Error("EFT dekontu yuklenmeden odeme onaylanamaz.");
  const product = typeof order.product === "object" && order.product ? order.product : await payload.findByID({ collection: "qurbani-products", id: relationId(order.product), depth: 1, overrideAccess: true });
  const campaignId = relationId(product.campaign);
  const fundingPoolId = relationId(product.fundingPool);
  const conversationId = `eft_qurbani_${order.id}_${Date.now()}`;
  const paymentId = `EFT-${order.orderNumber}`;
  const existingIntents = await payload.find({ collection: "donation-intents", where: { qurbaniOrder: { equals: order.id } }, sort: "-createdAt", limit: 1, depth: 0, overrideAccess: true });
  const intent = existingIntents.docs[0] || await payload.create({ collection: "donation-intents", data: { conversationId, donorName: order.buyerName, email: order.buyerEmail, phone: order.buyerPhone, campaign: campaignId, fundingPool: fundingPoolId, qurbaniOrder: order.id, amount: order.totalAmount, currency: order.currency, note: `Kurban EFT ${order.orderNumber}`, taxReceiptRequested: false, kvkkAcceptedAt: order.kvkkAcceptedAt, termsAcceptedAt: order.termsAcceptedAt, source: "qurbani_eft", status: "completed" }, overrideAccess: true });
  const existingSessions = await payload.find({ collection: "payment-sessions", where: { donationIntent: { equals: intent.id } }, sort: "-createdAt", limit: 1, depth: 0, overrideAccess: true });
  const session = existingSessions.docs[0] || await payload.create({ collection: "payment-sessions", data: { donationIntent: intent.id, conversationId: intent.conversationId || conversationId, providerStatus: "EFT_APPROVED", paymentId, rawResponse: { proofBucket: order.eftProofBucket, proofPath: order.eftProofPath, reviewedBy: input.actorId } }, overrideAccess: true });
  const existingDonations = await payload.find({ collection: "donations", where: { qurbaniOrder: { equals: order.id } }, sort: "-createdAt", limit: 1, depth: 0, overrideAccess: true });
  const donation = existingDonations.docs[0] || await payload.create({ collection: "donations", data: { donorName: order.buyerName, email: order.buyerEmail, phone: order.buyerPhone, campaign: campaignId, fundingPool: fundingPoolId, qurbaniOrder: order.id, grossAmount: order.totalAmount, netConfirmedAmount: order.totalAmount, currency: order.currency, status: "paid", paymentId, receiptNumber: `MIZ-${paymentId}-${Date.now().toString(36).toUpperCase()}`, paymentSession: session.id, taxReceiptRequested: false, donationNote: `Kurban EFT ${order.orderNumber}` }, overrideAccess: true });
  await payload.update({ collection: "qurbani-orders", id: order.id, data: { donationIntent: intent.id, donation: donation.id, providerPaymentId: paymentId, providerReference: order.orderNumber, eftReviewedAt: new Date().toISOString(), eftReviewedBy: input.actorId }, overrideAccess: true });
  const confirmed = await confirmQurbaniOrderPayment({ orderId: order.id, donationId: donation.id, providerPaymentId: paymentId, actor: input.actorEmail || "eft-admin" });
  await recordPaymentLedgerEntry({ donationId: Number(donation.id), campaignId: Number(campaignId), fundingPoolId: Number(fundingPoolId), entryType: "capture", amount: Number(order.totalAmount), currency: order.currency, providerReference: paymentId, idempotencyKey: `capture:${paymentId}`, metadata: { qurbaniOrderId: order.id, paymentMethod: "eft" } });
  await fulfillPaidDonation(payload, donation.id);
  await logAuditEvent(payload, { action: "qurbani.eft_approved", actorEmail: input.actorEmail, targetCollection: "qurbani-orders", targetId: order.id, details: { donationId: donation.id, poolId: confirmed?.pool_id }, });
  return { donation, confirmed };
}

export async function transferQurbaniOrder(payload: Payload, input: { orderId: string | number; targetPoolId: string | number; actorId: string | number; actorEmail?: string }) {
  const result = await transferQurbaniOrderTransaction(input);
  await logAuditEvent(payload, { action: "qurbani.order_transfer_requested", actorEmail: input.actorEmail, targetCollection: "qurbani-orders", targetId: input.orderId, details: result || {} });
  return result;
}

export async function confirmQurbaniPowerOfAttorney(payload: Payload, input: { orderId: string | number; actorId: string | number; actorEmail?: string }) {
  const order = await payload.findByID({ collection: "qurbani-orders", id: input.orderId, depth: 0, overrideAccess: true });
  if (order.status === "cancelled" || order.status === "expired") throw new Error("Iptal veya suresi dolmus sipariste vekalet teyit edilemez.");
  const updated = await payload.update({ collection: "qurbani-orders", id: order.id, data: { phoneProxyConfirmedAt: new Date().toISOString(), phoneProxyConfirmedBy: input.actorId }, overrideAccess: true });
  await logAuditEvent(payload, { action: "qurbani.proxy_confirmed", actorEmail: input.actorEmail, targetCollection: "qurbani-orders", targetId: order.id, details: {} });
  return updated;
}

export async function approveQurbaniVideo(payload: Payload, input: { videoId: string | number; actorId: string | number; actorEmail?: string }) {
  const video = await payload.findByID({ collection: "qurbani-videos", id: input.videoId, depth: 0, overrideAccess: true });
  if (video.status !== "ready_for_review" || !video.processedStorageKey) throw new Error("Video onaya hazir degil.");
  const poolId = relationId(video.pool);
  const updated = await payload.update({ collection: "qurbani-videos", id: video.id, data: { status: "approved", approvedAt: new Date().toISOString(), approvedBy: input.actorId }, overrideAccess: true });
  await payload.update({ collection: "qurbani-pools", id: poolId, data: { status: "ready" }, overrideAccess: true });
  await logAuditEvent(payload, { action: "qurbani.video_approved", actorEmail: input.actorEmail, targetCollection: "qurbani-videos", targetId: video.id, details: { poolId } });
  return updated;
}

export async function prepareQurbaniMessages(payload: Payload, input: { poolId: string | number; actorId: string | number; actorEmail?: string }) {
  const pool = await payload.findByID({ collection: "qurbani-pools", id: input.poolId, depth: 0, overrideAccess: true });
  if (pool.status !== "ready" || !pool.code) throw new Error("Havuzun islenmis videosu henuz hazir degil.");
  const videos = await payload.find({ collection: "qurbani-videos", where: { and: [{ pool: { equals: pool.id } }, { status: { in: ["ready_to_send", "approved"] } }] }, sort: "-readyAt", limit: 1, depth: 0, overrideAccess: true });
  const video = videos.docs[0];
  if (!video) throw new Error("Gonderime hazir kurban videosu bulunamadi.");
  const sharesResult = await payload.find({ collection: "qurbani-shares", where: { and: [{ pool: { equals: pool.id } }, { status: { equals: "confirmed" } }] }, pagination: false, sort: "sequence", depth: 0, overrideAccess: true });
  const byPhone = new Map<string, any[]>();
  for (const share of sharesResult.docs) {
    const phone = normalizePhone(String(share.effectivePhone || ""));
    if (!phone) continue;
    byPhone.set(phone, [...(byPhone.get(phone) || []), share]);
  }
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const created = [];
  for (const [phone, shares] of byPhone) {
    const hash = phoneHash(phone);
    const idempotencyKey = `qurbani:${pool.id}:${video.id}:${hash}`;
    const existing = await payload.find({ collection: "qurbani-messages", where: { idempotencyKey: { equals: idempotencyKey } }, limit: 1, depth: 0, overrideAccess: true });
    if (existing.docs[0]) { created.push(existing.docs[0]); continue; }
    const { token, digest } = issueQurbaniAccessToken();
    const orderId = relationId(shares[0].order);
    const accessLink = await payload.create({ collection: "qurbani-access-links", data: { pool: pool.id, order: orderId, video: video.id, tokenDigest: digest, recipientPhone: phone, recipientPhoneHash: hash, shareIds: shares.map((share) => String(share.id)), shares: shares.map((share) => share.id), expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString() }, overrideAccess: true });
    const names = shares.map((share) => String(share.ownerName));
    const trackingUrl = `${baseUrl}/kurban/takip/${encodeURIComponent(token)}`;
    const correctionPrefix = video.correctionRequired ? "Duzeltme: " : "";
    const body = `${correctionPrefix}Kurban organizasyonunuz tamamlandi. Kod: ${pool.code}. ${shares.length} hisse: ${names.join(", ")}. Kisisel video baglantiniz: ${trackingUrl}`;
    const message = await payload.create({ collection: "qurbani-messages", data: { pool: pool.id, accessLink: accessLink.id, channel: "whatsapp", recipientPhone: phone, recipientPhoneHash: hash, shareSummary: { count: shares.length, names, shareIds: shares.map((share) => String(share.id)) }, body, idempotencyKey, status: "queued" }, overrideAccess: true });
    created.push(message);
  }
  await logAuditEvent(payload, { action: "qurbani.messages_prepared", actorEmail: input.actorEmail, targetCollection: "qurbani-pools", targetId: pool.id, details: { count: created.length } });
  return created;
}

export async function sendQueuedQurbaniMessages(payload: Payload, messageIds: string[]) {
  let queued = 0;
  const dispatchBatchId = randomUUID();
  let runAt = Date.now();
  const selected = [];
  for (const id of [...new Set(messageIds)].slice(0, 250)) {
    const message = await payload.findByID({ collection: "qurbani-messages", id, depth: 0, overrideAccess: true });
    if (message.channel === "whatsapp" && ["queued", "failed"].includes(message.status))
      selected.push(message);
  }
  const byPhone = new Map<string, typeof selected>();
  for (const message of selected)
    byPhone.set(message.recipientPhone, [...(byPhone.get(message.recipientPhone) || []), message]);

  for (const [index, messages] of [...byPhone.values()].entries()) {
    const message = messages[0];
    const bundledIds = messages.slice(1).map((item) => String(item.id));
    if (bundledIds.length) {
      await payload.update({
        collection: "qurbani-messages",
        id: message.id,
        data: {
          body: messages.map((item) => item.body).join("\n\n"),
          shareSummary: {
            ...(typeof message.shareSummary === "object" ? message.shareSummary : {}),
            bundledMessageIds: bundledIds,
          },
        },
        overrideAccess: true,
      });
      for (const bundled of messages.slice(1))
        await payload.update({
          collection: "qurbani-messages",
          id: bundled.id,
          data: { status: "cancelled", lastError: `Birleşik mesaj: ${message.id}` },
          overrideAccess: true,
        });
    }
    if (index > 0) runAt += randomInt(30, 61) * 1000;
    const scheduledAt = new Date(runAt).toISOString();
    const jobKey = `send-message:${message.id}`;
    const existingJob = await payload.find({
      collection: "qurbani-jobs",
      where: { idempotencyKey: { equals: jobKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    await payload.update({
      collection: "qurbani-messages",
      id: message.id,
      data: { status: "queued", dispatchBatchId, scheduledAt, lastError: null },
      overrideAccess: true,
    });
    if (!existingJob.docs[0]) {
      await payload.create({
        collection: "qurbani-jobs",
        data: {
          type: "send_whatsapp",
          status: "queued",
          message: message.id,
          pool: message.pool,
          runAt: scheduledAt,
          idempotencyKey: jobKey,
          payload: { dispatchBatchId },
        },
        overrideAccess: true,
      });
    }
    queued += 1;
  }
  return { sent: 0, failed: 0, queued, dispatchBatchId };
}

export async function deliverQueuedQurbaniMessage(payload: Payload, messageId: string | number) {
  const message = await payload.findByID({ collection: "qurbani-messages", id: messageId, depth: 0, overrideAccess: true });
  if (["sent", "delivered", "read", "cancelled", "paused"].includes(message.status)) return { skipped: true };
  if (message.channel !== "whatsapp" || !["queued", "failed"].includes(message.status)) return { skipped: true };
  await payload.update({ collection: "qurbani-messages", id: message.id, data: { status: "sending", attemptCount: Number(message.attemptCount || 0) + 1, lastError: null }, overrideAccess: true });
  try {
    const result = await sendEvolutionText(message.recipientPhone, message.body);
    await payload.update({ collection: "qurbani-messages", id: message.id, data: { status: "sent", providerMessageId: result.providerMessageId || undefined, sentAt: new Date().toISOString(), lastError: null }, overrideAccess: true });
    const summary = typeof message.shareSummary === "object" && message.shareSummary
      ? message.shareSummary as Record<string, unknown>
      : {};
    const bundledIds = Array.isArray(summary.bundledMessageIds)
      ? summary.bundledMessageIds.map(String)
      : [];
    const affectedMessages = [message];
    for (const bundledId of bundledIds) {
      const bundled = await payload.findByID({ collection: "qurbani-messages", id: bundledId, depth: 0, overrideAccess: true });
      await payload.update({
        collection: "qurbani-messages",
        id: bundled.id,
        data: {
          status: "sent",
          providerMessageId: result.providerMessageId || undefined,
          sentAt: new Date().toISOString(),
          lastError: null,
        },
        overrideAccess: true,
      });
      affectedMessages.push(bundled);
    }
    for (const poolId of new Set(affectedMessages.map((item) => relationId(item.pool)))) {
      const remaining = await payload.find({ collection: "qurbani-messages", where: { and: [{ pool: { equals: poolId } }, { status: { in: ["queued", "paused", "sending", "failed"] } }] }, limit: 1, depth: 0, overrideAccess: true });
      if (!remaining.docs[0]) await payload.update({ collection: "qurbani-pools", id: poolId, data: { status: "notified" }, overrideAccess: true });
    }
    return { skipped: false, providerMessageId: result.providerMessageId };
  } catch (error) {
    await payload.update({ collection: "qurbani-messages", id: message.id, data: { status: "failed", lastError: error instanceof Error ? error.message.slice(0, 1000) : "WhatsApp gonderim hatasi." }, overrideAccess: true });
    throw error;
  }
}

export async function setQurbaniMessageBatchState(payload: Payload, input: { dispatchBatchId: string; action: "pause" | "resume" | "cancel" }) {
  const messages = await payload.find({ collection: "qurbani-messages", where: { dispatchBatchId: { equals: input.dispatchBatchId } }, pagination: false, depth: 0, overrideAccess: true });
  const mutable = messages.docs.filter((message) => ["queued", "paused", "failed"].includes(message.status));
  for (const message of mutable) {
    const status = input.action === "pause" ? "paused" : input.action === "cancel" ? "cancelled" : "queued";
    await payload.update({ collection: "qurbani-messages", id: message.id, data: { status }, overrideAccess: true });
    await payload.update({
      collection: "qurbani-jobs",
      where: { and: [{ message: { equals: message.id } }, { status: { in: ["queued", "paused", "failed"] } }] },
      data: { status: input.action === "pause" ? "paused" : input.action === "cancel" ? "cancelled" : "queued", lockedAt: null, lockedBy: null },
      overrideAccess: true,
    });
  }
  return { affected: mutable.length };
}

export async function revokeQurbaniAccessLink(payload: Payload, input: { accessLinkId: string | number; actorEmail?: string }) {
  const link = await payload.findByID({ collection: "qurbani-access-links", id: input.accessLinkId, depth: 0, overrideAccess: true });
  if (!link.revokedAt) await payload.update({ collection: "qurbani-access-links", id: link.id, data: { revokedAt: new Date().toISOString() }, overrideAccess: true });
  await payload.update({ collection: "qurbani-messages", where: { and: [{ accessLink: { equals: link.id } }, { status: { in: ["queued", "sending", "failed"] } }] }, data: { status: "cancelled" }, overrideAccess: true });
  await logAuditEvent(payload, { action: "qurbani.access_link_revoked", actorEmail: input.actorEmail, targetCollection: "qurbani-access-links", targetId: link.id, details: { poolId: relationId(link.pool) } });
  return link;
}
