import assert from "node:assert/strict";
import { validateCampaignSaveIntent } from "../lib/admin/campaign-save-intent";

function form(values: Record<string, string | undefined>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) data.set(key, value);
  return data;
}

for (const values of [
  {},
  { status: "draft" },
  { saveIntent: "publish" },
  { saveIntent: "draft", status: "active" },
  { saveIntent: "publish", status: "draft" },
  { saveIntent: "update", status: "closed" },
  { saveIntent: "update", status: "closed", id: "0" },
  { saveIntent: "update", status: "closed", id: "1 OR 1=1" },
  { saveIntent: "next", status: "draft" },
  { saveIntent: "publish", status: "unknown" },
]) {
  assert.throws(() => validateCampaignSaveIntent(form(values as Record<string, string>)));
}
for (const values of [
  { saveIntent: "draft", status: "draft" },
  { saveIntent: "publish", status: "active" },
  { saveIntent: "update", status: "closed", id: "42" },
  { saveIntent: "update", status: "archived", id: "42" },
]) {
  assert.doesNotThrow(() => validateCampaignSaveIntent(form(values)));
}
console.log("Campaign explicit-save validation: 14 cases passed (no database writes).");
