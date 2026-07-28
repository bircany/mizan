import assert from "node:assert/strict";
import test from "node:test";

import { contentDisposition, parseSingleRange, resolveStorageKey } from "../src/storage.js";

test("single HTTP byte ranges are parsed safely", () => {
  assert.deepEqual(parseSingleRange("bytes=0-99", 1_000), { start: 0, end: 99 });
  assert.deepEqual(parseSingleRange("bytes=900-", 1_000), { start: 900, end: 999 });
  assert.deepEqual(parseSingleRange("bytes=-50", 1_000), { start: 950, end: 999 });
  assert.throws(() => parseSingleRange("bytes=0-1,4-5", 1_000));
  assert.throws(() => parseSingleRange("bytes=1000-", 1_000));
});

test("storage keys cannot escape their volume", () => {
  const root = process.platform === "win32" ? "C:\\video\\ready" : "/video/ready";
  assert.match(resolveStorageKey(root, "12/video.mp4"), /video[\\/]ready[\\/]12[\\/]video\.mp4$/i);
  assert.throws(() => resolveStorageKey(root, "../secret"));
  assert.throws(() => resolveStorageKey(root, "/etc/passwd"));
  assert.throws(() => resolveStorageKey(root, "12\\..\\secret"));
});

test("download header has ASCII fallback and RFC 5987 filename", () => {
  const header = contentDisposition("attachment", "MİZAN-2026.mp4");
  assert.match(header, /^attachment;/);
  assert.match(header, /filename\*=UTF-8''/);
  assert.equal(header.includes("\r"), false);
});
