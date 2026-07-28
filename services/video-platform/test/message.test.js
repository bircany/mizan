import assert from "node:assert/strict";
import test from "node:test";

import { derivePublicLinkToken } from "../src/access-materials.js";
import { stableStringify } from "../src/message-fingerprint.js";
import { renderDeliveryMessage } from "../src/message-renderer.js";
import { encryptAccessCode } from "../src/security/access-code-crypto.js";

test("stable JSON makes fingerprint input independent of object key order", () => {
  assert.equal(
    stableStringify({ b: 2, a: { z: 1, y: 2 } }),
    stableStringify({ a: { y: 2, z: 1 }, b: 2 }),
  );
});

test("group link token is deterministic but not the group id", () => {
  const secret = "z".repeat(32);
  const token = derivePublicLinkToken(42, secret);
  assert.equal(token, derivePublicLinkToken("42", secret));
  assert.equal(token.length, 43);
  assert.equal(token.includes("42"), false);
});

test("worker renders immutable link, group and decrypted access code", () => {
  const key = Buffer.alloc(32, 3);
  const text = renderDeliveryMessage({
    group_id: 42,
    video_id: 8,
    message_type: "normal",
    body_snapshot: "Videonuz hazırdır.",
    message_snapshot: {
      schemaVersion: 1,
      recipientNames: ["Ayşe", "Mehmet", "Ayşe"],
      campaignName: "2026 Kurban",
    },
    system_payload_snapshot: {
      schemaVersion: 1,
      groupId: 42,
      videoId: 8,
      messageType: "normal",
    },
  }, {
    id: 42,
    code: "MD-2026-0001",
    access_code_ciphertext: encryptAccessCode("ABCD2345", key),
  }, {
    key,
    publicLinkSecret: "l".repeat(32),
    publicBaseUrl: "https://video.softartdevstudios.cloud",
  });
  assert.match(text, /Ayşe, Mehmet/);
  assert.match(text, /MD-2026-0001/);
  assert.match(text, /ABCD2345/);
  assert.match(text, /https:\/\/video\.softartdevstudios\.cloud\/video\/[A-Za-z0-9_-]{43}/);
});
