import assert from "node:assert/strict";
import test from "node:test";

import { ensureModernAccessCode } from "../src/access-materials.js";
import { decryptAccessCode, encryptAccessCode } from "../src/security/access-code-crypto.js";
import { verifyAccessCode } from "../src/security/access-code.js";

const key = Buffer.alloc(32, 7);
const config = { key };

function database(existingCode, sent = false) {
  const updates = [];
  const runTransaction = async (callback) => callback({
    async query(sql, parameters) {
      if (sql.includes("select id, access_code_ciphertext")) {
        return { rows: [{ id: 42, access_code_ciphertext: encryptAccessCode(existingCode, key) }] };
      }
      if (sql.includes("select 1 from delivery_messages")) return { rowCount: sent ? 1 : 0 };
      if (sql.includes("update operation_groups")) {
        updates.push(parameters);
        return { rowCount: 1 };
      }
      throw new Error("Unexpected query");
    },
  });
  return { runTransaction, updates };
}

test("unsent legacy access codes become four-digit PINs", async () => {
  const fixture = database("RJ2HLCDK");
  const ciphertext = await ensureModernAccessCode(42, config, fixture.runTransaction);
  const code = decryptAccessCode(ciphertext, key);
  assert.match(code, /^\d{4}$/);
  assert.equal(fixture.updates.length, 1);
  assert.equal(await verifyAccessCode(code, fixture.updates[0][1]), true);
});

test("already shared legacy codes are preserved and cannot be resent", async () => {
  const fixture = database("RJ2HLCDK", true);
  await assert.rejects(ensureModernAccessCode(42, config, fixture.runTransaction), /Eski kod daha önce paylaşılmış/);
  assert.equal(fixture.updates.length, 0);
});

test("modern PINs are not rotated repeatedly", async () => {
  const fixture = database("0427");
  const ciphertext = await ensureModernAccessCode(42, config, fixture.runTransaction);
  assert.equal(decryptAccessCode(ciphertext, key), "0427");
  assert.equal(fixture.updates.length, 0);
});
