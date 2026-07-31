import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.DELIVERY_EVOLUTION_WEBHOOK_SECRET =
  "local-webhook-test-secret-at-least-32-bytes";

const { verifyDeliveryEvolutionWebhook } =
  await import("../lib/delivery/evolution");

const timestamp = 1_800_000_000;
const rawBody = JSON.stringify({
  event: "messages.update",
  data: { key: { id: "provider-message-1" }, status: "READ" },
});
const signature = createHmac(
  "sha256",
  process.env.DELIVERY_EVOLUTION_WEBHOOK_SECRET,
)
  .update(`${timestamp}.${rawBody}`)
  .digest("hex");
const headers = new Headers({
  "x-mizan-timestamp": String(timestamp),
  "x-mizan-signature": `v1=${signature}`,
});

const valid = verifyDeliveryEvolutionWebhook(rawBody, headers, {
  now: timestamp * 1000,
});
assert.equal(valid.valid, true);
if (valid.valid) {
  assert.match(valid.replayKey, /^[a-f0-9]{64}$/);
  assert.equal(valid.timestamp, timestamp);
  assert.equal(valid.method, "hmac");
}

const native = verifyDeliveryEvolutionWebhook(
  rawBody,
  new Headers({
    "x-evolution-webhook-secret": process.env.DELIVERY_EVOLUTION_WEBHOOK_SECRET,
  }),
  { now: timestamp * 1000 },
);
assert.equal(native.valid, true);
if (native.valid) assert.equal(native.method, "native-secret");

assert.deepEqual(
  verifyDeliveryEvolutionWebhook(`${rawBody} `, headers, {
    now: timestamp * 1000,
  }),
  { valid: false, reason: "invalid_signature" },
);
assert.deepEqual(
  verifyDeliveryEvolutionWebhook(rawBody, headers, {
    now: (timestamp + 301) * 1000,
  }),
  { valid: false, reason: "expired_timestamp" },
);
assert.deepEqual(
  verifyDeliveryEvolutionWebhook(
    rawBody,
    new Headers({ "x-mizan-timestamp": String(timestamp) }),
    { now: timestamp * 1000 },
  ),
  { valid: false, reason: "invalid_signature" },
);

console.log("Delivery webhook signature checks passed.");
