import assert from "node:assert/strict";

import {
  formatIstanbulDateTime,
  getIstanbulYear,
  istanbulDateTimeLocalToIso,
  toIstanbulDateTimeLocal,
} from "../lib/time";

assert.equal(
  toIstanbulDateTimeLocal("2026-07-31T08:00:00.000Z"),
  "2026-07-31T11:00",
);
assert.equal(
  istanbulDateTimeLocalToIso("2026-07-31T11:00"),
  "2026-07-31T08:00:00.000Z",
);
assert.match(
  formatIstanbulDateTime("2026-07-31T21:30:00.000Z"),
  /1 Ağu 2026 00:30/,
);
assert.equal(getIstanbulYear("2026-12-31T22:00:00.000Z"), 2027);
assert.throws(() => istanbulDateTimeLocalToIso("2026-02-30T12:00"));

console.log("Istanbul time formatting and form conversion checks passed.");
