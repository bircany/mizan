import assert from "node:assert/strict";
import test from "node:test";

import { canCleanVideo } from "../src/video-inventory.js";

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
});
