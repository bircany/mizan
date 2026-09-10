import { AsYouType, parsePhoneNumberFromString, validatePhoneNumberLength, type CountryCode } from "libphonenumber-js/min";
import { normalizeInternationalPhone } from "@/lib/phone";

/** Return null for an overlong edit instead of silently saving a truncated number. */
export function formatAdminPhoneInput(raw: string, country: CountryCode) {
  let selected = country;
  let digits = raw.replace(/\D/g, "");
  if (/^\s*(\+|00)/.test(raw)) {
    const parsed = parsePhoneNumberFromString(raw.trim().replace(/^00/, "+"));
    if (parsed?.country) {
      selected = parsed.country;
      digits = parsed.nationalNumber;
    } else if (digits) return null;
  }
  if (selected === "TR") {
    if (digits.length === 12 && digits.startsWith("90")) digits = digits.slice(2);
    digits = digits.replace(/^0+/, "");
  }
  if (digits.length > 15 || (selected === "TR" && digits.length > 10) || validatePhoneNumberLength(digits, selected) === "TOO_LONG") return null;
  return { country: selected, number: new AsYouType(selected).input(digits) };
}

export function adminPhoneError(number: string, country: CountryCode, required: boolean) {
  if (!number.trim()) return required ? "Telefon numarası girin." : "";
  if (country === "TR" && number.replace(/\D/g, "").length !== 10) return "Telefon numarası +90 dışında 10 rakam olmalıdır.";
  try { normalizeInternationalPhone(number, country); return ""; }
  catch { return "Seçilen ülkeye uygun geçerli bir telefon numarası girin."; }
}
