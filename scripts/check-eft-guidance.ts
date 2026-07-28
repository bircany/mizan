import assert from "node:assert/strict";

import {
  formatIban,
  isValidTurkishIban,
  parseEftGuidance,
  validatePublishedEftGuidance,
} from "../lib/eft-guidance";

const validTestIban = "TR330006100519786457841326";

assert.equal(isValidTurkishIban(validTestIban), true);
assert.equal(isValidTurkishIban("TR000000000000000000000000"), false);
assert.equal(
  formatIban(validTestIban),
  "TR33 0006 1005 1978 6457 8413 26",
);

const guidance = parseEftGuidance("EFT / Havale", [
  "Transferden önce dernek ekibiyle iletişime geçin.",
  "Telefon: 0552 402 67 38",
  "WhatsApp: 0552 402 67 38",
  "Çalışma Saatleri: Hafta içi 09:00 - 18:00",
  "Banka: Test Bankası",
  "Hesap Sahibi: Test Derneği",
  `IBAN: ${validTestIban}`,
  "Para Birimi: TRY",
]);

assert.equal(guidance.accounts.length, 1);
assert.equal(guidance.accounts[0]?.bankName, "Test Bankası");
assert.equal(guidance.workingHours, "Hafta içi 09:00 - 18:00");
assert.equal(
  validatePublishedEftGuidance("EFT", [
    "Telefon: 0552 402 67 38",
    "Banka: Test Bankası",
    "Hesap Sahibi: Test Derneği",
    `IBAN: ${validTestIban}`,
  ].join("\n\n")),
  null,
);
assert.match(
  validatePublishedEftGuidance(
    "EFT",
    "Telefon: 0552 402 67 38\n\nIBAN: TR000000000000000000000000",
  ) || "",
  /geçerli TR IBAN/,
);

console.log("EFT yönlendirme ve IBAN doğrulama kontrolleri geçti.");
