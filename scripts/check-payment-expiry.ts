import assert from "node:assert/strict";

import {
  DEFAULT_CARD_RESERVATION_MINUTES,
  isPaymentReservationExpired,
  resolveCardReservationMinutes,
} from "../lib/payments/reservation-expiry";

assert.equal(
  resolveCardReservationMinutes(undefined),
  DEFAULT_CARD_RESERVATION_MINUTES,
);
assert.equal(resolveCardReservationMinutes("15"), 15);
assert.equal(
  resolveCardReservationMinutes("4"),
  DEFAULT_CARD_RESERVATION_MINUTES,
);
assert.equal(
  resolveCardReservationMinutes("121"),
  DEFAULT_CARD_RESERVATION_MINUTES,
);
assert.equal(
  resolveCardReservationMinutes("invalid"),
  DEFAULT_CARD_RESERVATION_MINUTES,
);

const now = Date.parse("2026-07-30T12:00:00.000Z");
assert.equal(
  isPaymentReservationExpired(
    {
      status: "payment_initialized",
      reservationExpiresAt: "2026-07-30T12:01:00.000Z",
    },
    now,
  ),
  false,
);
assert.equal(
  isPaymentReservationExpired(
    {
      status: "payment_initialized",
      reservationExpiresAt: "2026-07-30T12:00:00.000Z",
    },
    now,
  ),
  true,
);
assert.equal(
  isPaymentReservationExpired(
    {
      status: "expired",
      reservationExpiresAt: "2026-07-30T12:01:00.000Z",
    },
    now,
  ),
  true,
);
assert.equal(
  isPaymentReservationExpired(
    {
      status: "completed",
      reservationExpiresAt: "2026-07-30T11:00:00.000Z",
    },
    now,
  ),
  false,
);
assert.equal(
  isPaymentReservationExpired({ status: "payment_initialized" }, now),
  true,
);

console.log("Payment reservation expiry checks passed.");
