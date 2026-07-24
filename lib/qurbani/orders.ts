import "server-only";

import type { Payload } from "payload";

import { decryptQurbaniCheckoutPii } from "@/lib/qurbani/checkout-crypto";
import { qurbaniQuery } from "@/lib/qurbani/db";
import type { CreateQurbaniOrderInput } from "@/lib/qurbani/validation";

type ReservationRow = {
  order_id: number;
  pool_id: number;
  reserved_until: Date;
  total_amount: string;
  currency: string;
};

export async function reserveQurbaniOrder(input: CreateQurbaniOrderInput, ipAddress: string) {
  const payload = {
    productId: input.productId,
    buyerName: `${input.buyer.firstName} ${input.buyer.lastName}`.trim(),
    buyerEmail: input.buyer.email,
    buyerPhone: input.buyer.phone,
    countryCode: input.buyer.countryCode,
    identityType: input.buyer.countryCode === "TR" ? "tc_identity" : "passport",
    identityNumber: input.buyer.identityNumber,
    addressSnapshot: { address: input.buyer.address, city: input.buyer.city, countryCode: input.buyer.countryCode },
    paymentMethod: input.paymentMethod,
    proxyAccepted: true,
    proxyTextVersion: "qurbani-proxy-v1-2026-07",
    kvkkAccepted: true,
    termsAccepted: true,
    thirdPartyContactConsent: Boolean(input.consents.thirdPartyContact),
    ipAddress,
    shares: input.shareholders.map((share) => ({ ownerName: share.name, ownerPhone: share.phone || "" })),
  };
  const result = await qurbaniQuery<ReservationRow>("select * from private.qurbani_reserve_order($1::jsonb)", [JSON.stringify(payload)]);
  const row = result.rows[0];
  if (!row) throw new Error("Kurban rezervasyonu olusturulamadi.");
  return { orderId: row.order_id, poolId: row.pool_id, reservedUntil: new Date(row.reserved_until), totalAmount: Number(row.total_amount), currency: row.currency };
}

export async function confirmQurbaniOrderPayment(input: { orderId: string | number; donationId?: string | number | null; providerPaymentId?: string | null; actor?: string }) {
  const result = await qurbaniQuery<{ pool_id: number; pool_code: string | null; already_confirmed: boolean }>(
    "select * from private.qurbani_confirm_order_payment($1::integer, $2::integer, $3::text, $4::text)",
    [Number(input.orderId), input.donationId ? Number(input.donationId) : null, input.providerPaymentId || null, input.actor || "system"],
  );
  return result.rows[0];
}

export async function expireQurbaniReservations() {
  const [legacy, bounded] = await Promise.all([
    qurbaniQuery<{ count: number }>(
      "select private.qurbani_expire_reservations()::integer as count",
    ),
    qurbaniQuery<{ count: number }>(
      "select private.qurbani_expire_holds()::integer as count",
    ),
  ]);
  return (legacy.rows[0]?.count || 0) + (bounded.rows[0]?.count || 0);
}

export async function purgeExpiredQurbaniCheckoutPii(limit = 500) {
  const result = await qurbaniQuery<{ count: number }>(
    "select private.qurbani_purge_checkout_pii($1::integer)::integer as count",
    [Math.max(1, Math.min(Math.trunc(limit), 2000))],
  );
  return result.rows[0]?.count || 0;
}

export async function transferQurbaniOrder(input: { orderId: string | number; targetPoolId: string | number; actorId: string | number }) {
  const result = await qurbaniQuery<{ source_pool_id: number; target_pool_id: number; target_pool_code: string | null }>(
    "select * from private.qurbani_transfer_order($1::integer, $2::integer, $3::integer)",
    [Number(input.orderId), Number(input.targetPoolId), Number(input.actorId)],
  );
  return result.rows[0];
}

export async function linkQurbaniPaymentIntent(payload: Payload, orderId: string | number, intentId: string | number) {
  return payload.update({ collection: "qurbani-orders", id: orderId, data: { donationIntent: intentId }, overrideAccess: true });
}

export async function finalizeQurbaniCheckoutPayment(input: { checkoutId: string | number; paymentId: string; donationId: string | number; actor?: string }) {
  const checkoutResult = await qurbaniQuery<{ status: string; encrypted_payload: string | null; encryption_iv: string | null; encryption_tag: string | null; encryption_key_version: string | null }>(
    "select status::text, encrypted_payload, encryption_iv, encryption_tag, encryption_key_version from qurbani_checkouts where id = $1::integer limit 1",
    [Number(input.checkoutId)],
  );
  const checkout = checkoutResult.rows[0];
  if (checkout?.status === "succeeded") {
    const existingOrders = await qurbaniQuery<{ id: number }>("select id from qurbani_orders where checkout_id = $1::integer order by id", [Number(input.checkoutId)]);
    return { state: "already_finalized", checkoutId: Number(input.checkoutId), orderIds: existingOrders.rows.map((row) => row.id) };
  }
  await qurbaniQuery(
    "update qurbani_checkouts set status = 'payment_received_processing', provider_payment_id = $2::text, donation_id = $3::integer, updated_at = now() where id = $1::integer and status <> 'succeeded'",
    [Number(input.checkoutId), input.paymentId, Number(input.donationId)],
  );
  if (!checkout?.encrypted_payload || !checkout.encryption_iv || !checkout.encryption_tag || !checkout.encryption_key_version) throw new Error("Kurban checkout şifreli kişi verisi bulunamadı.");
  const storedPayload = checkout.encrypted_payload.trim().startsWith("{") ? JSON.parse(checkout.encrypted_payload) as Record<string, unknown> : {};
  const normalizedEnvelope = {
    v: storedPayload.v || 1,
    alg: storedPayload.alg || "A256GCM",
    iv: checkout.encryption_iv,
    tag: checkout.encryption_tag,
    data: storedPayload.data || storedPayload.ciphertext || checkout.encrypted_payload,
    kid: checkout.encryption_key_version,
  };
  const decryptedPayload = decryptQurbaniCheckoutPii<Record<string, unknown>>(JSON.stringify(normalizedEnvelope));
  const result = await qurbaniQuery<{ result: { state?: string; checkoutId?: number; checkout_id?: number; orderIds?: number[]; order_ids?: number[] } }>(
    "select private.qurbani_finalize_checkout($1::integer, $2::text, $3::integer, $4::text, $5::jsonb) as result",
    [Number(input.checkoutId), input.paymentId, Number(input.donationId), input.actor || "system", JSON.stringify(decryptedPayload)],
  );
  const finalized = result.rows[0]?.result;
  if (!finalized) throw new Error("Kurban checkout finalizer sonucu alınamadı.");
  return finalized;
}

export async function failQurbaniCheckout(checkoutId: string | number, failureCode: string) {
  const result = await qurbaniQuery<{ result: { state?: string; checkoutId?: number; checkout_id?: number } }>(
    "select private.qurbani_fail_checkout($1::integer, $2::text) as result",
    [Number(checkoutId), failureCode.slice(0, 120)],
  );
  return result.rows[0]?.result;
}
