import { isValidTurkishIdentityNumber } from "@/lib/turkish-identity";

export type CreateQurbaniOrderInput = {
  productId: string;
  shareCount: number;
  shareholders: Array<{ name: string; phone?: string }>;
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    identityNumber: string;
    countryCode: string;
    city: string;
    address: string;
  };
  paymentMethod: "iyzico" | "eft";
  receiptRequested: boolean;
  consents: {
    digitalPowerOfAttorney: boolean;
    terms: boolean;
    kvkk: boolean;
    thirdPartyContact?: boolean;
  };
  locale?: "tr" | "en" | "ar";
};

const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const phone = (value: unknown) => text(value, 24).replace(/[^\d+() -]/g, "");

export function parseCreateQurbaniOrder(value: unknown): CreateQurbaniOrderInput {
  if (!value || typeof value !== "object") throw new Error("Siparis bilgileri gecersiz.");
  const body = value as Record<string, any>;
  const shareCount = Number(body.shareCount);
  const productId = text(body.productId, 40);
  const rawBuyer = body.buyer && typeof body.buyer === "object" ? body.buyer : {};
  const buyer = {
    firstName: text(rawBuyer.firstName, 80),
    lastName: text(rawBuyer.lastName, 80),
    email: text(rawBuyer.email, 180).toLowerCase(),
    phone: phone(rawBuyer.phone),
    identityNumber: text(rawBuyer.identityNumber, 32),
    countryCode: text(rawBuyer.countryCode, 2).toUpperCase(),
    city: text(rawBuyer.city, 100),
    address: text(rawBuyer.address, 500),
  };
  const shareholders = Array.isArray(body.shareholders)
    ? body.shareholders.slice(0, 7).map((item: any) => ({ name: text(item?.name, 120), phone: phone(item?.phone) || undefined }))
    : [];
  const consents = body.consents && typeof body.consents === "object" ? body.consents : {};

  if (!productId || !Number.isInteger(shareCount) || shareCount < 1 || shareCount > 7 || shareholders.length !== shareCount) {
    throw new Error("Urun ve hisse sayisi gecersiz.");
  }
  if (shareholders.some((item) => item.name.length < 2)) throw new Error("Her hisse sahibi icin ad soyad zorunludur.");
  if (!buyer.firstName || !buyer.lastName || !buyer.email.includes("@") || buyer.phone.replace(/\D/g, "").length < 10 || !buyer.countryCode || !buyer.city || !buyer.address) {
    throw new Error("Alici bilgileri eksik veya gecersiz.");
  }
  if (!buyer.identityNumber) throw new Error("Kimlik veya pasaport numarasi zorunludur.");
  if (buyer.countryCode === "TR" && !isValidTurkishIdentityNumber(buyer.identityNumber)) {
    throw new Error("T.C. Kimlik Numarasi gecersiz.");
  }
  if (buyer.countryCode !== "TR" && !/^[A-Za-z0-9][A-Za-z0-9 -]{4,31}$/.test(buyer.identityNumber)) {
    throw new Error("Pasaport veya ulusal kimlik numarasi gecersiz.");
  }
  if (body.paymentMethod !== "iyzico" && body.paymentMethod !== "eft") throw new Error("Odeme yontemi gecersiz.");
  if (!consents.digitalPowerOfAttorney || !consents.terms || !consents.kvkk) throw new Error("Vekalet, KVKK ve bagis sartlari onaylanmalidir.");
  if (shareholders.some((item) => item.phone) && !consents.thirdPartyContact) {
    throw new Error("Ucuncu kisi iletisim bilgileri icin bilgilendirme onayi zorunludur.");
  }

  return {
    productId,
    shareCount,
    shareholders,
    buyer,
    paymentMethod: body.paymentMethod,
    receiptRequested: Boolean(body.receiptRequested),
    consents: {
      digitalPowerOfAttorney: true,
      terms: true,
      kvkk: true,
      thirdPartyContact: Boolean(consents.thirdPartyContact),
    },
    locale: ["tr", "en", "ar"].includes(body.locale) ? body.locale : "tr",
  };
}
