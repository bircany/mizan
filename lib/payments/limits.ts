export const DEFAULT_IYZICO_MAX_PAYMENT_AMOUNT = 100_000;

export function resolveIyzicoMaxPaymentAmount(value?: string | number | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_IYZICO_MAX_PAYMENT_AMOUNT;
}

export function isIyzicoAmountAllowed(amount: number, maximum: number) {
  return Number.isFinite(amount) && amount > 0 && amount < maximum;
}

export function getMaximumCardQuantity(unitPrice: number, maximum: number) {
  if (
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0 ||
    !Number.isFinite(maximum) ||
    maximum <= 0
  ) {
    return 0;
  }

  // iyzico üst sınırı dahil değildir. Örn. 25.000 × 4 = 100.000 reddedilir.
  return Math.max(0, Math.ceil(maximum / unitPrice) - 1);
}
