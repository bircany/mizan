import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

import { hashAccessCode, verifyAccessCode } from "../src/security/access-code.js";
import { decryptAccessCode, encryptAccessCode } from "../src/security/access-code-crypto.js";
import { createMediaToken, verifyMediaToken } from "../src/security/media-token.js";
import { verifyUploadToken } from "../src/security/upload-token.js";

function b64(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

test("Ed25519 upload token enforces claims and ten-minute lifetime", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const now = 1_800_000_000;
  const header = b64({ alg: "EdDSA", typ: "JWT", kid: "key-1" });
  const payload = b64({
    iss: "mizan-web",
    aud: "mizan-video-upload",
    sub: "42",
    role: "field_operator",
    groupId: "17",
    videoId: "99",
    jti: "01K123456789ABCDEFGHJKMNPQ",
    nonce: "nonce_1234567890",
    maxBytes: 2_147_483_648,
    allowedMime: ["video/mp4", "video/quicktime", "video/webm"],
    iat: now,
    exp: now + 600,
  });
  const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
  const claims = verifyUploadToken(`${header}.${payload}.${signature}`, {
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    keyId: "key-1",
    issuer: "mizan-web",
    audience: "mizan-video-upload",
    maxBytes: 2_147_483_648,
    maxTokenLifetimeSeconds: 600,
    clockToleranceSeconds: 20,
  }, now);
  assert.equal(claims.videoId, "99");
  assert.deepEqual(claims.allowedMime, ["video/mp4", "video/quicktime", "video/webm"]);
  assert.throws(
    () => verifyUploadToken(`${header}.${payload}.${signature}`, {
      publicKey: publicKey.export({ type: "spki", format: "pem" }),
      keyId: "wrong",
      issuer: "mizan-web",
      audience: "mizan-video-upload",
      maxBytes: 2_147_483_648,
      maxTokenLifetimeSeconds: 600,
      clockToleranceSeconds: 20,
    }, now),
    /anahtar kimliği|key/i,
  );
});

test("media authorization is purpose-bound and short-lived", () => {
  const secret = "a".repeat(32);
  const token = createMediaToken({
    videoId: 9,
    groupId: 3,
    codeVersion: 2,
    purpose: "stream",
  }, secret, 300, 2_000);
  assert.equal(
    verifyMediaToken(token, secret, { videoId: 9, purpose: "stream" }, 2_299).groupId,
    "3",
  );
  assert.throws(
    () => verifyMediaToken(token, secret, { videoId: 9, purpose: "download" }, 2_100),
    /süresi|yetkisi|authorization/i,
  );
  assert.throws(
    () => verifyMediaToken(token, secret, { videoId: 9, purpose: "stream" }, 2_301),
    /süresi|yetkisi|authorization/i,
  );
});

test("access code hashing and VDS-only encryption round-trip", async () => {
  const encoded = await hashAccessCode("ABCD-2345");
  assert.equal(await verifyAccessCode("abcd 2345", encoded), true);
  assert.equal(await verifyAccessCode("ABCD2346", encoded), false);
  const key = Buffer.alloc(32, 7);
  const encrypted = encryptAccessCode("ABCD2345", key);
  assert.notEqual(encrypted.includes("ABCD2345"), true);
  assert.equal(decryptAccessCode(encrypted, key), "ABCD2345");
  const parts = encrypted.split(".");
  parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;
  assert.throws(() => decryptAccessCode(parts.join("."), key));
});
