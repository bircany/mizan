import { NextResponse } from "next/server";

import { isSupportedCountryCode } from "@/lib/countries";
import { getPayloadClient } from "@/lib/payload";
import { createPaymentInitialization, PaymentInitializationError } from "@/lib/payments/service";
import { getPaymentPublicUrl } from "@/lib/payments/urls";
import { qurbaniQuery } from "@/lib/qurbani/db";
import { encryptQurbaniCheckoutPii } from "@/lib/qurbani/checkout-crypto";
import { failQurbaniCheckout } from "@/lib/qurbani/orders";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { isValidTurkishIdentityNumber, normalizeTurkishIdentityNumber } from "@/lib/turkish-identity";

type CheckoutItem = {
  productId: number;
  priceRevisionId: number;
  priceRevision: number;
  quantity: number;
  shareholders: Array<{ name: string; phone: string }>;
};

type CheckoutRequest = {
  items: CheckoutItem[];
  buyer: { firstName: string; lastName: string; email: string; phone: string; identityNumber: string; countryCode: string; city: string; address: string };
  receiptRequested: boolean;
  consents: { digitalPowerOfAttorney: true; thirdPartyContact: true; kvkk: true; terms: true };
  locale: "tr" | "en" | "ar";
};

type RpcCheckout = {
  success?: boolean;
  code?: string;
  error?: string;
  checkoutId?: number;
  checkout_id?: number;
  publicId?: string;
  public_id?: string;
  totalAmount?: number | string;
  total_amount?: number | string;
  currency?: string;
  expiresAt?: string;
  expires_at?: string;
};

const cleanText = (value: unknown, maxLength: number) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";
const cleanPhone = (value: unknown) => cleanText(value, 24).replace(/[^\d+() -]/g, "");
const relationId = (value: unknown) => value && typeof value === "object" && "id" in value ? String((value as { id: string | number }).id) : String(value || "");

function parseBody(value: unknown): CheckoutRequest {
  if (!value || typeof value !== "object") throw new Error("Checkout bilgileri geçersiz.");
  const body = value as Record<string, unknown>;
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 7) : [];
  const items = rawItems.map((raw) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const productId = Number(item.productId);
    const priceRevisionId = Number(item.priceRevisionId);
    const priceRevision = Number(item.priceRevision);
    const quantity = Number(item.quantity);
    const shareholders = Array.isArray(item.shareholders) ? item.shareholders.slice(0, 7).map((rawOwner) => {
      const owner = rawOwner && typeof rawOwner === "object" ? rawOwner as Record<string, unknown> : {};
      return { name: cleanText(owner.name, 120), phone: cleanPhone(owner.phone) };
    }) : [];
    if (![productId, priceRevisionId, priceRevision, quantity].every(Number.isInteger) || productId < 1 || priceRevisionId < 1 || priceRevision < 1 || quantity < 1 || quantity > 7 || shareholders.length !== quantity || shareholders.some((owner) => owner.name.length < 2)) throw new Error("Ürün, fiyat revizyonu veya hissedar listesi geçersiz.");
    return { productId, priceRevisionId, priceRevision, quantity, shareholders };
  });
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  if (!items.length || totalQuantity > 7 || new Set(items.map((item) => item.productId)).size !== items.length) throw new Error("Tek ödemede 1–7 hisse ve benzersiz ürünler seçilebilir.");

  const rawBuyer = body.buyer && typeof body.buyer === "object" ? body.buyer as Record<string, unknown> : {};
  const countryCode = cleanText(rawBuyer.countryCode, 2).toUpperCase();
  const identityInput = cleanText(rawBuyer.identityNumber, 30);
  const buyer = {
    firstName: cleanText(rawBuyer.firstName, 80), lastName: cleanText(rawBuyer.lastName, 80), email: cleanText(rawBuyer.email, 254).toLowerCase(), phone: cleanPhone(rawBuyer.phone),
    identityNumber: countryCode === "TR" ? normalizeTurkishIdentityNumber(identityInput) : identityInput.toUpperCase(), countryCode, city: cleanText(rawBuyer.city, 100), address: cleanText(rawBuyer.address, 500),
  };
  if (!buyer.firstName || !buyer.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email) || buyer.phone.replace(/\D/g, "").length < 10 || !buyer.city || !buyer.address || !isSupportedCountryCode(countryCode)) throw new Error("Bağışçı bilgileri geçersiz.");
  if (countryCode === "TR" ? !isValidTurkishIdentityNumber(buyer.identityNumber) : !/^[A-Z0-9][A-Z0-9 -]{4,29}$/.test(buyer.identityNumber)) throw new Error("Kimlik bilgisi geçersiz.");
  const rawConsents = body.consents && typeof body.consents === "object" ? body.consents as Record<string, unknown> : {};
  if (rawConsents.digitalPowerOfAttorney !== true || rawConsents.thirdPartyContact !== true || rawConsents.kvkk !== true || rawConsents.terms !== true) throw new Error("Zorunlu onaylar eksik.");
  const locale = body.locale === "en" || body.locale === "ar" ? body.locale : "tr";
  return { items, buyer, receiptRequested: body.receiptRequested === true, consents: { digitalPowerOfAttorney: true, thirdPartyContact: true, kvkk: true, terms: true }, locale };
}

function ipOf(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(request: Request) {
  let checkoutId = 0;
  try {
    const input = parseBody(await request.json());
    const ipAddress = ipOf(request);
    await enforceRateLimit({ scope: "qurbani-checkout", identity: `${ipAddress}:${input.buyer.email}`, maxRequests: 5, windowSeconds: 15 * 60 });

    const encryptedPii = JSON.parse(encryptQurbaniCheckoutPii({
      buyer: input.buyer,
      shareholdersByProduct: input.items.map((item) => ({ productId: item.productId, shareholders: item.shareholders })),
      receiptRequested: input.receiptRequested,
      consents: { ...input.consents, acceptedAt: new Date().toISOString() },
    })) as { v: 1; alg: "A256GCM"; iv: string; tag: string; data: string; kid: string };
    const piiEnvelope = { ...encryptedPii, ciphertext: encryptedPii.data, keyVersion: encryptedPii.kid };
    const rpcInput = {
      ipAddress,
      piiEnvelope,
      items: input.items.map((item) => ({ productId: item.productId, priceRevisionId: item.priceRevisionId, priceRevision: item.priceRevision, quantity: item.quantity })),
    };
    const holdResult = await qurbaniQuery<{ result: RpcCheckout }>("select private.qurbani_create_checkout($1::jsonb) as result", [JSON.stringify(rpcInput)]);
    const hold = holdResult.rows[0]?.result || {};
    if (hold.success === false || hold.code === "OUT_OF_STOCK") return NextResponse.json({ success: false, code: hold.code || "OUT_OF_STOCK", error: hold.error || "Seçilen kurban stoğu değişti." }, { status: 409 });
    checkoutId = Number(hold.checkoutId || hold.checkout_id || 0);
    const totalAmount = Number(hold.totalAmount || hold.total_amount || 0);
    const currency = String(hold.currency || "TRY");
    if (!checkoutId || !Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error("Checkout hold sonucu geçersiz.");

    const payload = await getPayloadClient();
    const firstProduct = await payload.findByID({ collection: "qurbani-products", id: input.items[0].productId, depth: 1, overrideAccess: true });
    const fundingPoolId = relationId(firstProduct.fundingPool);
    if (!fundingPoolId) throw new Error("Kurban ödeme havuzu bulunamadı.");
    const initialized = await createPaymentInitialization(payload, {
      donorName: `${input.buyer.firstName} ${input.buyer.lastName}`.trim(), email: input.buyer.email, phone: input.buyer.phone, identityNumber: input.buyer.identityNumber,
      countryCode: input.buyer.countryCode, address: input.buyer.address, city: input.buyer.city, amount: totalAmount, currency, campaignId: fundingPoolId,
      note: `Kurban checkout ${hold.publicId || hold.public_id || checkoutId} · ${input.items.reduce((sum, item) => sum + item.quantity, 0)} hisse`, taxReceiptRequested: input.receiptRequested,
      kvkkAcceptedAt: new Date().toISOString(), termsAcceptedAt: new Date().toISOString(), ip: ipAddress,
      callbackUrl: getPaymentPublicUrl(request.url, "/api/payments/callback"), qurbaniCheckoutId: checkoutId,
    });
    await payload.update({ collection: "qurbani-checkouts" as never, id: checkoutId, overrideAccess: true, data: { status: "payment_initialized", donationIntent: initialized.intentId, providerConversationId: initialized.conversationId } as never });
    return NextResponse.json({ success: true, checkoutId, publicId: hold.publicId || hold.public_id, expiresAt: hold.expiresAt || hold.expires_at, ...initialized });
  } catch (error) {
    if (checkoutId) await failQurbaniCheckout(checkoutId, "PAYMENT_INITIALIZATION_FAILED").catch(() => undefined);
    const status = error instanceof RateLimitError ? error.status : error instanceof PaymentInitializationError ? error.status : 400;
    const safeMessage = error instanceof RateLimitError || error instanceof PaymentInitializationError
      ? error.message
      : "Kurban ödemesi başlatılamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
    return NextResponse.json({ success: false, code: "CHECKOUT_FAILED", error: safeMessage }, { status });
  }
}
