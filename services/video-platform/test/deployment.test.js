import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const composeUrl = new URL("../../../deploy/video/compose.yaml", import.meta.url);
const videoRepositoryUrl = new URL("../src/video-repository.js", import.meta.url);
const messageRepositoryUrl = new URL("../src/message-repository.js", import.meta.url);

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

test("video failure metadata casts variadic JSON parameters explicitly", async () => {
  const repository = await readFile(videoRepositoryUrl, "utf8");

  assert.match(repository, /'lastFailureCode', \$7::text/);
  assert.match(repository, /last_error_code = \$7::text/);
});

test("message worker enforces test delivery only when policy requires it", async () => {
  const repository = await readFile(messageRepositoryUrl, "utf8");

  assert.match(repository, /if \(!message\.is_test && requireTestBeforeDispatch\)/);
});
