import assert from "node:assert/strict";
import test from "node:test";

import { outputDimensions, validateProbe } from "../src/video-probe.js";

function probe(formatName, codecName, width, height, duration, audio = "aac") {
  return {
    format: { format_name: formatName, duration: String(duration) },
    streams: [
      { codec_type: "video", codec_name: codecName, width, height, disposition: { attached_pic: 0 } },
      ...(audio ? [{ codec_type: "audio", codec_name: audio }] : []),
    ],
  };
}

test("MP4, MOV and WebM containers are verified from ffprobe data", () => {
  assert.equal(validateProbe(probe("mov,mp4,m4a,3gp,3g2,mj2", "h264", 1920, 1080, 599), "video/mp4", { maxSeconds: 600 }).containerFormat, "mp4");
  assert.equal(validateProbe(probe("mov,mp4,m4a,3gp,3g2,mj2", "prores", 1080, 1920, 60), "video/quicktime", { maxSeconds: 600 }).containerFormat, "mov");
  assert.equal(validateProbe(probe("matroska,webm", "vp9", 1280, 720, 30, "opus"), "video/webm", { maxSeconds: 600 }).containerFormat, "webm");
  assert.throws(() => validateProbe(probe("avi", "h264", 1280, 720, 30), "video/mp4", { maxSeconds: 600 }));
  assert.throws(() => validateProbe(probe("mov,mp4", "h264", 1280, 720, 601), "video/mp4", { maxSeconds: 600 }));
});

test("dimension calculation preserves orientation and never upscales", () => {
  assert.deepEqual(outputDimensions(3840, 2160), { width: 1920, height: 1080, scaled: true });
  assert.deepEqual(outputDimensions(2160, 3840), { width: 1080, height: 1920, scaled: true });
  assert.deepEqual(outputDimensions(640, 360), { width: 640, height: 360, scaled: false });
});
