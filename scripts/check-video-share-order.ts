import assert from "node:assert/strict";
import { sortVideoShareAreas } from "../lib/donations/video-share-order";

const mixed = [3, 2, 6, 7, 4, 5, 1].map((capacity) => ({
  slug: `video-kurban-${capacity}-kisilik-grup`,
  capacity,
}));
const ordered = sortVideoShareAreas(mixed);
assert.deepEqual(ordered.map((area) => area.capacity), [1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(mixed.map((area) => area.capacity), [3, 2, 6, 7, 4, 5, 1]);

const withOtherAreas = sortVideoShareAreas([
  { slug: "yetim-destegi" },
  { slug: "video-kurban-7-kisilik-grup" },
  { slug: "su-kuyusu" },
  { slug: "video-kurban-1-kisilik-grup" },
]);
assert.deepEqual(withOtherAreas.map((area) => area.slug), [
  "video-kurban-1-kisilik-grup",
  "video-kurban-7-kisilik-grup",
  "yetim-destegi",
  "su-kuyusu",
]);

console.log("Video share donation areas are ordered 1–7 without changing unrelated order.");
