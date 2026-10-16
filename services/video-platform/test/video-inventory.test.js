import assert from "node:assert/strict";
import test from "node:test";

import {
  canCleanVideo,
  canForceCleanVideo,
  requestAllStoredVideosCleanup,
  requestStoredVideoCleanup,
} from "../src/video-inventory.js";

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

test("protected videos can only be force-cleaned while no message is sending", () => {
  assert.equal(canForceCleanVideo({ ...candidate, status: "ready", is_active: true }), true);
  assert.equal(canForceCleanVideo({ ...candidate, status: "processing" }), false);
  assert.equal(canForceCleanVideo({ ...candidate, sending_messages: 1 }), false);
  assert.equal(canForceCleanVideo({ ...candidate, physical_deleted_at: new Date() }), false);
  assert.equal(canForceCleanVideo({ ...candidate, cleanup_requested_at: new Date() }), false);
});

test("bulk cleanup cancels mutable messages and queues every idle video", async () => {
  const calls = [];
  const runTransaction = async (callback) => callback({
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("select v.id, v.group_id")) return { rows: [{ id: 4, group_id: 2 }, { id: 5, group_id: 3 }] };
      if (sql.includes("select count(*)::int")) return { rows: [{ count: 1 }] };
      if (sql.includes("update delivery_messages")) return { rowCount: 2 };
      if (sql.includes("update operation_groups")) return { rowCount: 2 };
      if (sql.includes("update operation_videos")) return { rowCount: 2, rows: [{ id: 4 }, { id: 5 }] };
      throw new Error("Unexpected query");
    },
  });
  const result = await requestAllStoredVideosCleanup(9, "TÜM VİDEOLARI SİL", runTransaction);
  assert.deepEqual(result, { cleanupQueued: 2, cancelledMessages: 2, skippedBusy: 1 });
  assert.equal(calls.length, 5);
  assert.match(calls[2].sql, /status = 'cancelled'/);
  assert.match(calls[3].sql, /active_video_id = null/);
  assert.match(calls[4].sql, /bulk_admin_cleanup/);
});

test("bulk cleanup requires the exact destructive confirmation phrase", async () => {
  await assert.rejects(
    requestAllStoredVideosCleanup(9, "sil", async () => assert.fail("transaction must not start")),
    /Toplu temizlik onayı eşleşmedi/,
  );
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
  const result = await requestStoredVideoCleanup(4, 9, {}, runTransaction);
  assert.deepEqual(result, { videoId: "4", groupId: "2", cleanupQueued: true });
  assert.equal(calls.length, 2);
  assert.match(calls[1].sql, /adminCleanupRequestedAt/);
});

test("force cleanup cancels pending messages and detaches the active test video", async () => {
  const calls = [];
  const runTransaction = async (callback) => callback({
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("select v.id")) return { rows: [{
        ...candidate,
        group_id: 2,
        group_code: "MD-2026-0004",
        status: "ready",
        is_active: true,
        active_video_id: 4,
        pending_messages: 1,
        sending_messages: 0,
      }] };
      if (sql.includes("select id, status from delivery_messages")) return { rows: [{ id: 8, status: "queued" }] };
      if (sql.includes("update delivery_messages")) return { rowCount: 1 };
      if (sql.includes("update operation_groups")) return { rowCount: 1 };
      if (sql.includes("update operation_videos")) return { rowCount: 1 };
      throw new Error("Unexpected query");
    },
  });
  const result = await requestStoredVideoCleanup(4, 9, {
    force: true,
    groupCode: "MD-2026-0004",
  }, runTransaction);
  assert.deepEqual(result, {
    videoId: "4",
    groupId: "2",
    cleanupQueued: true,
    forced: true,
    cancelledMessages: 1,
  });
  assert.equal(calls.length, 5);
  assert.match(calls[2].sql, /status = 'cancelled'/);
  assert.match(calls[3].sql, /active_video_id/);
  assert.match(calls[4].sql, /adminCleanupForced/);
});
