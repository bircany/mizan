import assert from "node:assert/strict";
import { adminPhoneError, formatAdminPhoneInput } from "../lib/admin/phone-input";
for (const raw of ["05321234567", "5321234567", "+90 (532) 123-45-67", "00905321234567", "905321234567"]) {
  assert.deepEqual(formatAdminPhoneInput(raw, "TR"), {country:"TR",number:"532 123 45 67"});
}
assert.equal(formatAdminPhoneInput("53212345678", "TR"), null);
assert.equal(formatAdminPhoneInput("202555012345", "US"), null);
assert.equal(formatAdminPhoneInput("abc532!", "TR")?.number,"532");
assert.equal(formatAdminPhoneInput("", "TR")?.number, "");
assert.equal(formatAdminPhoneInput("+4915123456789", "TR")?.country, "DE");
assert.ok(adminPhoneError("532 123", "TR", true));
assert.ok(adminPhoneError("111 111 11 11", "TR", true));
assert.equal(adminPhoneError("532 123 45 67", "TR", true), "");
assert.equal(adminPhoneError("", "TR", false), "");
assert.ok(adminPhoneError("", "TR", true));
assert.ok(adminPhoneError("123", "DE", false));
console.log("PASS: Turkish/international paste, formatting, country detection, length limits, required/optional phone validation.");
