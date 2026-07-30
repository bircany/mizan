export const DEFAULT_CARD_RESERVATION_MINUTES = 30;

export function resolveCardReservationMinutes(value: string | undefined) {
  if (!value?.trim()) return DEFAULT_CARD_RESERVATION_MINUTES;
  const minutes = Number(value);
  if (!Number.isSafeInteger(minutes) || minutes < 5 || minutes > 120) {
    return DEFAULT_CARD_RESERVATION_MINUTES;
  }
  return minutes;
}

export function isPaymentReservationExpired(
  input: {
    status?: unknown;
    reservationExpiresAt?: unknown;
  },
  now = Date.now(),
) {
  const status = String(input.status || "");
  if (status === "completed") return false;
  if (status === "expired" || status === "cancelled") return true;
  if (
    typeof input.reservationExpiresAt !== "string" ||
    !input.reservationExpiresAt
  ) {
    return true;
  }
  const expiresAt = Date.parse(input.reservationExpiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}
