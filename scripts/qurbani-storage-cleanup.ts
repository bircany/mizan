import { getPayloadClient } from "../lib/payload";
import { getQurbaniVideoStorage } from "../lib/qurbani/storage";

async function main() {
  const payload = await getPayloadClient();
  const storage = getQurbaniVideoStorage();
  const now = new Date().toISOString();
  const [raw, processed] = await Promise.all([
    payload.find({ collection: "qurbani-videos", where: { rawDeleteAfter: { less_than_equal: now } }, pagination: false, depth: 0, overrideAccess: true }),
    payload.find({ collection: "qurbani-videos", where: { processedDeleteAfter: { less_than_equal: now } }, pagination: false, depth: 0, overrideAccess: true }),
  ]);
  for (const video of raw.docs) {
    if (video.rawStorageKey) await storage.remove("raw", video.rawStorageKey);
  }
  for (const video of processed.docs) {
    if (video.processedStorageKey) await storage.remove("processed", video.processedStorageKey);
    if (video.thumbnailStorageKey) await storage.remove("covers", video.thumbnailStorageKey);
  }
  console.log(`Kurban storage temizligi: ${raw.docs.length} ham, ${processed.docs.length} islenmis kayit kontrol edildi.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
