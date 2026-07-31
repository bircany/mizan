import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const composeUrl = new URL("../../../deploy/video/compose.yaml", import.meta.url);

test("tusd CORS rule survives Coolify Compose deployment", async () => {
  const compose = await readFile(composeUrl, "utf8");

  assert.match(
    compose,
    /-cors-allow-origin=https:\/\/\(www\[\.\]\)\?mizander\[\.\]com\[\.\]tr/,
  );
  assert.doesNotMatch(compose, /TUSD_CORS_ALLOW_ORIGIN/);
});

test("video worker has a second database connection for repository updates", async () => {
  const compose = await readFile(composeUrl, "utf8");
  const worker = compose.match(/  video-worker:\r?\n([\s\S]*?)\r?\n  message-worker:/)?.[1];

  assert.ok(worker, "video-worker service must exist");
  assert.match(worker, /DATABASE_POOL_MAX:\s*"2"/);
});
