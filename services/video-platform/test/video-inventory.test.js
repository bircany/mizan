import assert from "node:assert/strict";
import test from "node:test";

import { canCleanVideo, requestStoredVideoCleanup } from "../src/video-inventory.js";

const candidate = {
  id: 4,
  status: "superseded",
  is_active: false,
  active_video_id: 5,
  physical_deleted_at: null,
  pending_messages: 0,
};

test("only unused, terminal VDS videos can be cleaned", () => {
  assert.equal(canCleanVideo(candidate), true);
  assert.equal(canCleanVideo({ ...candidate, is_active: true }), false);
  assert.equal(canCleanVideo({ ...candidate, active_video_id: 4 }), false);
  assert.equal(canCleanVideo({ ...candidate, status: "ready" }), false);
  assert.equal(canCleanVideo({ ...candidate, status: "processing" }), false);
  assert.equal(canCleanVideo({ ...candidate, pending_messages: 1 }), false);
  assert.equal(canCleanVideo({ ...candidate, physical_deleted_at: new Date() }), false);
  assert.equal(canCleanVideo({ ...candidate, cleanup_requested_at: new Date() }), false);
});

test("cleanup request queues metadata without touching VDS files", async () => {
  const calls = [];
  const runTransaction = async (callback) => callback({
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("select v.id")) return { rows: [{ ...candidate, group_id: 2 }] };
      if (sql.includes("update operation_videos")) return { rowCount: 1 };
      throw new Error("Unexpected query");
    },
  });
  const result = await requestStoredVideoCleanup(4, 9, runTransaction);
  assert.deepEqual(result, { videoId: "4", groupId: "2", cleanupQueued: true });
  assert.equal(calls.length, 2);
  assert.match(calls[1].sql, /adminCleanupRequestedAt/);
});
