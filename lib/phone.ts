import {
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

export function normalizeCountryCode(value: unknown): CountryCode {
  const countryCode =
    typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!isSupportedCountry(countryCode)) {
    throw new Error("Lütfen geçerli bir telefon ülkesi seçin.");
  }
  return countryCode;
}

export function countryCallingCode(value: unknown) {
  return `+${getCountryCallingCode(normalizeCountryCode(value))}`;
}

export function normalizeInternationalPhone(
  value: unknown,
  countryValue: unknown,
) {
  const countryCode = normalizeCountryCode(countryValue);
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) throw new Error("Telefon numarası zorunludur.");

  const parsed = parsePhoneNumberFromString(
    raw.startsWith("+") ? raw : raw.replace(/^0+/, ""),
    countryCode,
  );

  if (
    !parsed?.isValid() ||
    (parsed.country && parsed.country !== countryCode)
  ) {
    throw new Error("Telefon numarası seçilen ülke için geçerli değil.");
  }

  return parsed.number;
}

export function optionalInternationalPhone(
  value: unknown,
  countryValue: unknown,
) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return normalizeInternationalPhone(value, countryValue);
}

export function evolutionPhoneDigits(value: unknown, countryValue?: unknown) {
  const normalized = countryValue
    ? normalizeInternationalPhone(value, countryValue)
    : typeof value === "string"
      ? value
      : "";
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new Error("WhatsApp alıcı numarası geçerli değil.");
  }
  return digits;
}
