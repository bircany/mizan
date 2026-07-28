import assert from "node:assert/strict";

import {
  DEFAULT_IYZICO_MAX_PAYMENT_AMOUNT,
  getMaximumCardQuantity,
  isIyzicoAmountAllowed,
  resolveIyzicoMaxPaymentAmount,
} from "../lib/payments/limits";

assert.equal(resolveIyzicoMaxPaymentAmount(undefined), 100_000);
assert.equal(resolveIyzicoMaxPaymentAmount("250000"), 250_000);
assert.equal(resolveIyzicoMaxPaymentAmount("geçersiz"), 100_000);

assert.equal(
  isIyzicoAmountAllowed(99_999.99, DEFAULT_IYZICO_MAX_PAYMENT_AMOUNT),
  true,
);
assert.equal(
  isIyzicoAmountAllowed(100_000, DEFAULT_IYZICO_MAX_PAYMENT_AMOUNT),
  false,
);
assert.equal(
  isIyzicoAmountAllowed(195_000, DEFAULT_IYZICO_MAX_PAYMENT_AMOUNT),
  false,
);

assert.equal(getMaximumCardQuantity(15_000, 100_000), 6);
assert.equal(getMaximumCardQuantity(25_000, 100_000), 3);
assert.equal(getMaximumCardQuantity(33_333.33, 100_000), 3);

console.log("iyzico ödeme limiti kontrolleri geçti.");
