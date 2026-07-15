const ALLOWED_CURRENCIES = new Set(["TRY", "USD", "EUR", "GBP"]);

export type PaymentInitializationInput = {
  donorName: string;
  email: string;
  phone: string;
  identityNumber?: string;
  address: string;
  city: string;
  amount: number;
  currency: string;
  campaignId: string | number;
  note?: string;
  taxReceiptRequested: boolean;
  kvkkAccepted: boolean;
  termsAccepted: boolean;
};

function requireText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${field} zorunludur.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`${field} geçersiz.`);
  return normalized;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Telefon zorunludur.");
  }

  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");

  if (/^0\d{10}$/.test(digits)) return `+90${digits.slice(1)}`;
  if (/^5\d{9}$/.test(digits)) return `+90${digits}`;
  if (/^90\d{10}$/.test(digits)) return `+${digits}`;
  if (raw.startsWith("+") && /^\d{10,15}$/.test(digits)) return `+${digits}`;

  throw new Error("Telefon numarası geçersiz.");
}

export function parsePaymentInitialization(body: unknown): PaymentInitializationInput {
  if (!body || typeof body !== "object") throw new Error("Geçersiz istek gövdesi.");
  const input = body as Record<string, unknown>;
  const amount = Number(input.amount);
  const currency = typeof input.currency === "string" ? input.currency.toUpperCase() : "TRY";
  const identityNumber = typeof input.identityNumber === "string"
    ? input.identityNumber.replace(/\s/g, "")
    : undefined;

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw new Error("Bağış tutarı geçersiz.");
  }

  if (!ALLOWED_CURRENCIES.has(currency)) throw new Error("Para birimi geçersiz.");
  if (input.campaignId === undefined || input.campaignId === null || input.campaignId === "") {
    throw new Error("Bağış alanı seçimi zorunludur.");
  }

  const email = requireText(input.email, "E-posta", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-posta geçersiz.");
  if (identityNumber && !/^\d{11}$/.test(identityNumber)) {
    throw new Error("T.C. Kimlik No 11 haneli olmalıdır.");
  }
  if (input.kvkkAccepted !== true || input.termsAccepted !== true) {
    throw new Error("KVKK ve bağışçı sözleşmesi onayları zorunludur.");
  }

  return {
    donorName: requireText(input.donorName, "Ad soyad", 120),
    email,
    phone: normalizePhone(input.phone),
    identityNumber,
    address: requireText(input.address, "Adres", 500),
    city: requireText(input.city, "Şehir", 100),
    amount,
    currency,
    campaignId: input.campaignId as string | number,
    note: typeof input.note === "string" ? input.note.trim().slice(0, 1000) || undefined : undefined,
    taxReceiptRequested: input.taxReceiptRequested === true,
    kvkkAccepted: true,
    termsAccepted: true,
  };
}
