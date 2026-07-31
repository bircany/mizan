import assert from "node:assert/strict";

import {
  countryCallingCode,
  evolutionPhoneDigits,
  normalizeInternationalPhone,
  optionalInternationalPhone,
} from "../lib/phone";

assert.equal(countryCallingCode("TR"), "+90");
assert.equal(normalizeInternationalPhone("0532 123 45 67", "TR"), "+905321234567");
assert.equal(normalizeInternationalPhone("0151 23456789", "DE"), "+4915123456789");
assert.equal(evolutionPhoneDigits("+90 532 123 45 67"), "905321234567");
assert.equal(optionalInternationalPhone("", "TR"), undefined);
assert.throws(
  () => normalizeInternationalPhone("123", "TR"),
  /seçilen ülke için geçerli değil/i,
);
assert.throws(() => normalizeInternationalPhone("+90 532 123 45 67", "DE"));

console.log("International phone normalization checks passed.");
