import assert from "node:assert/strict";

import {
  campaignCountersAllowDelete,
  campaignDeleteBlockReason,
} from "../lib/donations/campaign-delete-policy";

assert.equal(
  campaignDeleteBlockReason({ confirmedUnits: 0, reservedUnits: 0, donationCount: 0, intentCount: 0 }),
  null,
  "Durumu ne olursa olsun hareketsiz kampanya silinebilmelidir.",
);
assert.match(
  campaignDeleteBlockReason({ confirmedUnits: 1, reservedUnits: 0, donationCount: 0, intentCount: 0 }) || "",
  /alınmış hisse/,
);
assert.match(
  campaignDeleteBlockReason({ confirmedUnits: 0, reservedUnits: 1, donationCount: 0, intentCount: 0 }) || "",
  /bekleyen hisse rezervasyonu/,
);
assert.match(
  campaignDeleteBlockReason({ confirmedUnits: 0, reservedUnits: 0, donationCount: 1, intentCount: 0 }) || "",
  /kesinleşmiş bağış/,
);
assert.match(
  campaignDeleteBlockReason({ confirmedUnits: 0, reservedUnits: 0, donationCount: 0, intentCount: 1 }) || "",
  /başlatılmış ödeme kaydı/,
);
assert.equal(campaignCountersAllowDelete({ confirmedUnits: 0, reservedUnits: 0 }), true);
assert.equal(campaignCountersAllowDelete({ confirmedUnits: 1, reservedUnits: 0 }), false);
assert.equal(campaignCountersAllowDelete({ confirmedUnits: 0, reservedUnits: 1 }), false);

console.log("Campaign deletion policy: 8 cases passed.");
