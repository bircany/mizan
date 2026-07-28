import assert from "node:assert/strict";
import test from "node:test";

import { withoutConnectionStringSslOptions } from "../src/db.js";

test("database URL SSL options cannot override the configured TLS policy", () => {
  const normalized = new URL(
    withoutConnectionStringSslOptions(
      "postgresql://user:pass@example.test:5432/postgres?sslmode=require&sslrootcert=bad&application_name=mizan",
    ),
  );

  assert.equal(normalized.searchParams.has("sslmode"), false);
  assert.equal(normalized.searchParams.has("sslrootcert"), false);
  assert.equal(normalized.searchParams.get("application_name"), "mizan");
});

test("non-URL connection strings remain unchanged", () => {
  assert.equal(withoutConnectionStringSslOptions("not-a-url"), "not-a-url");
});
