import assert from "node:assert/strict";
import path from "node:path";

import { getQurbaniVideoStorage } from "../lib/qurbani/storage";
import { digestQurbaniAccessToken, issueQurbaniAccessToken, verifyQurbaniAccessToken } from "../lib/qurbani/tokens";
import { parseCreateQurbaniOrder } from "../lib/qurbani/validation";

async function main() {
  process.env.PAYLOAD_SECRET ||= "qurbani-test-secret-at-least-32-characters";
  const order = parseCreateQurbaniOrder({
    productId: "1",
    shareCount: 2,
    shareholders: [{ name: "Ali Veli" }, { name: "Ayşe Yılmaz", phone: "+90 555 111 22 33" }],
    buyer: { firstName: "Mehmet", lastName: "Demir", email: "test@example.org", phone: "+90 555 000 11 22", identityNumber: "10000000146", countryCode: "TR", city: "İstanbul", address: "Test adresi 1" },
    paymentMethod: "eft",
    receiptRequested: true,
    consents: { digitalPowerOfAttorney: true, terms: true, kvkk: true, thirdPartyContact: true },
    amount: 1,
  });
  assert.equal(order.shareholders.length, 2);
  assert.equal("amount" in order, false, "Tarayici tutari parse edilmemeli.");
  assert.throws(() => parseCreateQurbaniOrder({ ...order, buyer: { ...order.buyer, identityNumber: "10000000145" } }), /T\.C\./);

  const { token, digest } = issueQurbaniAccessToken();
  assert.equal(verifyQurbaniAccessToken(token), true);
  assert.equal(digestQurbaniAccessToken(token), digest);
  assert.equal(verifyQurbaniAccessToken(`${token}x`), false);

  const storage = getQurbaniVideoStorage();
  await storage.ensureDirectories();
  assert.equal(storage.root, path.resolve(process.cwd(), "var", "qurbani"));
  assert.throws(() => storage.resolve("raw", "../secret"), /Gecersiz/);
  console.log("Qurbani validation, token and local storage checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
