import assert from "node:assert/strict";
import {
  parseVideoFilters,
  filterVideos,
  videoTab,
  videoQuery,
} from "../lib/admin/video-filters";
import { deliveryVideoMime } from "../lib/delivery/upload-metadata";
import type { UnifiedDeliveryRow } from "../lib/admin/unified-panel-data";
assert.equal(parseVideoFilters({}).view, "cards");
assert.equal(parseVideoFilters({ view: "table" }).view, "table");
assert.equal(parseVideoFilters({ view: "invalid" }).view, "cards");
const row: UnifiedDeliveryRow = {
  id: "1",
  groupId: "1",
  groupCode: "MD-2026-1001",
  campaign: "İyilik Kurbanı",
  campaignId: "10",
  category: "Kurban",
  categoryId: "5",
  recipient: "1 alıcı",
  recipients: [],
  messageId: null,
  messageBody: "",
  status: "video_pending",
  videoStatus: "waiting",
  updatedAt: "2026-09-09T22:00:00Z",
};
assert.equal(
  filterVideos(
    [row],
    parseVideoFilters({
      q: "iyilik",
      category: "5",
      campaign: "10",
      group: "1001",
      from: "2026-09-10",
      to: "2026-09-10",
    }),
  ).length,
  1,
);
assert.equal(
  filterVideos([row], parseVideoFilters({ to: "2026-09-09" })).length,
  0,
);
assert.equal(
  filterVideos(
    [row],
    parseVideoFilters({ from: "2026-09-11", to: "2026-09-10" }),
  ).length,
  0,
);
assert.equal(
  filterVideos([row], parseVideoFilters({ category: "99" })).length,
  0,
);
assert.equal(
  parseVideoFilters({ from: "2026-02-30", page: "-3", view: "<script>" }).from,
  "",
);
assert.equal(parseVideoFilters({ q: ["bad"], page: "-3" }).page, 1);
for (const [status, videoStatus, tab] of [
  ["draft", "ready", "draft"],
  ["countdown", "ready", "sending"],
  ["sent", "ready", "completed"],
  ["draft", "quarantined", "failed"],
  ["video_pending", "review_pending", "waiting_video"],
  ["collecting", "ready", "draft"],
])
  assert.equal(videoTab({ ...row, status, videoStatus }), tab);
const query = new URLSearchParams(
  videoQuery(
    parseVideoFilters({ q: "a & b", category: "5", view: "cards" }),
    "failed",
    2,
  ),
);
assert.equal(query.get("view"), "cards");
assert.equal(query.get("q"), "a & b");
assert.equal(query.get("category"), "5");
assert.equal(query.get("page"), "2");
for (const [name, mime] of [
  ["a.mp4", "video/mp4"],
  ["a.MOV", "video/quicktime"],
  ["a.webm", ""],
  ["a.mp4", "application/octet-stream"],
])
  assert.ok(deliveryVideoMime(name, mime));
for (const [name, mime] of [
  ["evil.exe", "video/mp4"],
  ["a.mp4", "text/html"],
  ["a.mov", "video/mp4"],
  ["../a.mp4", "video/mp4"],
  ["a.mp4.exe", "video/mp4"],
])
  assert.equal(deliveryVideoMime(name, mime), null);
console.log(
  "PASS: combined filters, Turkish search/day boundary, invalid inputs, exclusive tabs, query preservation, upload extension/MIME allowlist.",
);
