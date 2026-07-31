import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveFinishedUploadPath } from "../src/tusd-hooks.js";

test("post-finish resolves a shared upload from video-api's mount", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mizan-tusd-hook-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const storageRoot = path.join(temporaryRoot, "video-api-uploads");
  const uploadId = "d23b2242-1a51-4d13-9618-90344e4378bd";
  await mkdir(storageRoot, { recursive: true });
  await writeFile(path.join(storageRoot, uploadId), "video");

  const resolved = await resolveFinishedUploadPath(
    storageRoot,
    uploadId,
    `/srv/uploads/${uploadId}`,
  );

  assert.equal(resolved, path.join(storageRoot, uploadId));
});

test("post-finish rejects a path for another upload", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mizan-tusd-hook-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const storageRoot = path.join(temporaryRoot, "video-api-uploads");
  const uploadId = "d23b2242-1a51-4d13-9618-90344e4378bd";
  await mkdir(storageRoot, { recursive: true });
  await writeFile(path.join(storageRoot, uploadId), "video");

  await assert.rejects(
    resolveFinishedUploadPath(storageRoot, uploadId, "/srv/uploads/another-upload"),
    (error) => error?.code === "upload_path_mismatch",
  );
});
