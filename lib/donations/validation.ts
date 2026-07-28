import { isSupportedCountryCode } from "@/lib/countries";
import {
  isValidTurkishIdentityNumber,
  normalizeTurkishIdentityNumber,
} from "@/lib/turkish-identity";

export type UnifiedDonationParticipantInput = {
  name: string;
  phone?: string;
  useBuyerIdentity: boolean;
};

export type UnifiedDonationCheckoutInput = {
  campaignId: string;
  paymentMethod: "card" | "eft";
  amount?: number;
  childDonationPackages?: Partial<Record<"food" | "stationery" | "toy" | "clothing", number>>;
  childDonationCurrency?: "TRY" | "USD" | "EUR";
  quantity: number;
  participants: UnifiedDonationParticipantInput[];
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
  note?: string;
  taxReceiptRequested: boolean;
  consents: {
    kvkk: true;
    terms: true;
    powerOfAttorney: boolean;
    thirdPartyContact: boolean;
  };
};

const text = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export function normalizeDonationPhone(value: unknown) {
  const raw = text(value, 24);
  const digits = raw.replace(/\D/g, "");

  if (/^0\d{10}$/.test(digits)) return `+90${digits.slice(1)}`;
  if (/^5\d{9}$/.test(digits)) return `+90${digits}`;
  if (/^90\d{10}$/.test(digits)) return `+${digits}`;
  if (raw.startsWith("+") && /^\d{10,15}$/.test(digits)) return `+${digits}`;

  throw new Error("Telefon numarası geçersiz.");
}

function optionalPhone(value: unknown) {
  if (!text(value, 24)) return undefined;
  return normalizeDonationPhone(value);
}

export function parseUnifiedDonationCheckout(
  value: unknown,
): UnifiedDonationCheckoutInput {
  if (!value || typeof value !== "object") {
    throw new Error("Bağış bilgileri geçersiz.");
  }

  const input = value as Record<string, unknown>;
  const buyerInput =
    input.buyer && typeof input.buyer === "object"
      ? (input.buyer as Record<string, unknown>)
      : {};
  const consentsInput =
    input.consents && typeof input.consents === "object"
      ? (input.consents as Record<string, unknown>)
      : {};

  const campaignId = text(input.campaignId, 80);
  const quantity = input.quantity === undefined ? 1 : Number(input.quantity);
  const rawAmount = input.amount === undefined ? undefined : Number(input.amount);
  const countryCode = text(buyerInput.countryCode, 2).toUpperCase();
  const identityNumber = text(buyerInput.identityNumber, 32);
  const email = text(buyerInput.email, 254).toLowerCase();

  if (!campaignId) throw new Error("Bağış seçimi zorunludur.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("Bağış adedi geçersiz.");
  }
  if (
    rawAmount !== undefined &&
    (!Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 1_000_000)
  ) {
    throw new Error("Bağış tutarı geçersiz.");
  }
  if (!isSupportedCountryCode(countryCode)) {
    throw new Error("Geçerli bir ülke seçin.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-posta adresi geçersiz.");
  }
  if (countryCode === "TR" && !isValidTurkishIdentityNumber(identityNumber)) {
    throw new Error("Geçerli bir T.C. Kimlik Numarası girin.");
  }
  if (
    countryCode !== "TR" &&
    !/^[A-Za-z0-9][A-Za-z0-9 -]{4,31}$/.test(identityNumber)
  ) {
    throw new Error("Pasaport veya ulusal kimlik numarası geçersiz.");
  }
  if (input.paymentMethod !== "card" && input.paymentMethod !== "eft") {
    throw new Error("Ödeme yöntemi geçersiz.");
  }
  if (consentsInput.kvkk !== true || consentsInput.terms !== true) {
    throw new Error("KVKK ve bağış şartları onaylanmalıdır.");
  }

  const firstName = text(buyerInput.firstName, 80);
  const lastName = text(buyerInput.lastName, 80);
  const city = text(buyerInput.city, 100);
  const address = text(buyerInput.address, 500);
  if (!firstName || !lastName || !city || !address) {
    throw new Error("Bağışçı adı ve adres bilgileri eksik.");
  }

  const participants = Array.isArray(input.participants)
    ? input.participants.slice(0, 100).map((item) => {
        const participant =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
        const useBuyerIdentity = participant.useBuyerIdentity === true;
        const name = useBuyerIdentity
          ? `${firstName} ${lastName}`.trim()
          : text(participant.name, 120);

        if (name.length < 2) {
          throw new Error("Her katılımcı için ad soyad zorunludur.");
        }

        return {
          name,
          phone: useBuyerIdentity
            ? normalizeDonationPhone(buyerInput.phone)
            : optionalPhone(participant.phone),
          useBuyerIdentity,
        };
      })
    : [];
  const childDonationPackages = input.childDonationPackages && typeof input.childDonationPackages === "object"
    ? Object.fromEntries(
        ["food", "stationery", "toy", "clothing"].flatMap((key) => {
          const value = Number((input.childDonationPackages as Record<string, unknown>)[key]);
          return Number.isInteger(value) && value > 0 && value <= 100 ? [[key, value]] : [];
        }),
      ) as UnifiedDonationCheckoutInput["childDonationPackages"]
    : undefined;
  const childDonationCurrency = ["TRY", "USD", "EUR"].includes(String(input.childDonationCurrency))
    ? String(input.childDonationCurrency) as "TRY" | "USD" | "EUR"
    : undefined;

  if (
    participants.some((participant) => !participant.useBuyerIdentity && participant.phone) &&
    consentsInput.thirdPartyContact !== true
  ) {
    throw new Error(
      "Üçüncü kişi telefonu için iletişim bilgilendirmesi onaylanmalıdır.",
    );
  }

  return {
    campaignId,
    paymentMethod: input.paymentMethod,
    amount: rawAmount,
    childDonationPackages,
    childDonationCurrency,
    quantity,
    participants,
    buyer: {
      firstName,
      lastName,
      email,
      phone: normalizeDonationPhone(buyerInput.phone),
      identityNumber:
        countryCode === "TR"
          ? normalizeTurkishIdentityNumber(identityNumber)
          : identityNumber.toUpperCase(),
      countryCode,
      city,
      address,
    },
    note: text(input.note, 1000) || undefined,
    taxReceiptRequested: input.taxReceiptRequested === true,
    consents: {
      kvkk: true,
      terms: true,
      powerOfAttorney: consentsInput.powerOfAttorney === true,
      thirdPartyContact: consentsInput.thirdPartyContact === true,
    },
  };
}
