import assert from "node:assert/strict";
import {
  roundedGroupStock,
  validateTailPlan,
} from "../lib/donations/group-plan";
assert.equal(roundedGroupStock(100, 6), 102);
assert.equal(roundedGroupStock(100, 7), 105);
assert.equal(roundedGroupStock(102, 6), 102);
assert.equal(roundedGroupStock(undefined, 6), undefined);
assert.equal(roundedGroupStock(100, undefined), 100);
for (const n of [0, -1, 1.5, NaN, Infinity, 501])
  assert.throws(() => roundedGroupStock(100, n));
for (const n of [0, -1, 1.5, NaN, Infinity, 1000001])
  assert.throws(() => roundedGroupStock(n, 6));
validateTailPlan([4, 3], [200000, 200000], 7, 6);
assert.throws(() => validateTailPlan([6, 1], [200000, 200000], 7, 6, 2));
for (const counts of [
  [4, 4],
  [0, 7],
  [1, 6.5],
  [7, 0],
  [NaN, 3],
])
  assert.throws(() => validateTailPlan(counts, [200000, 200000], 7, 6));
for (const prices of [
  [0, 10],
  [-1, 10],
  [1.5, 10],
  [NaN, 10],
])
  assert.throws(() => validateTailPlan([4, 3], prices, 7, 6));
console.log(
  "PASS: stock rounding, exact count conservation and integer-cent prices.",
);
