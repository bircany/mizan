export const CARD_PAYMENTS_UNAVAILABLE_MESSAGE =
  "Kartla ödeme geçici olarak aktif değil. Yakında sizlerle yeniden buluşturacağız.";

export function areCardPaymentsEnabled() {
  return process.env.CARD_PAYMENTS_ENABLED === "true";
}
