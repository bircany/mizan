import "server-only";

import type { Payload } from "payload";

import { getDeliveryVideoStorage } from "@/lib/delivery/storage";

type AnyDoc = Record<string, any> & { id: string | number };
type DeliveryPayload = {
  find(args: Record<string, unknown>): Promise<{ docs: AnyDoc[] }>;
  update(args: Record<string, unknown>): Promise<AnyDoc>;
};

export async function purgeExpiredDeliveryFiles(payload: Payload) {
  const api = payload as unknown as DeliveryPayload;
  const storage = getDeliveryVideoStorage();
  const now = new Date().toISOString();
  const retiredAt = "9999-12-31T23:59:59.999Z";
  const [raw, processed] = await Promise.all([
    api.find({
      collection: "operation-videos",
      where: {
        and: [
          { rawDeleteAfter: { less_than_equal: now } },
          { rawStorageKey: { exists: true } },
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    api.find({
      collection: "operation-videos",
      where: {
        and: [
          { processedDeleteAfter: { less_than_equal: now } },
          { processedStorageKey: { exists: true } },
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  for (const video of raw.docs) {
    if (await storage.exists("raw", String(video.rawStorageKey))) {
      await storage.remove("raw", String(video.rawStorageKey));
    }
    await api.update({
      collection: "operation-videos",
      id: video.id,
      data: { rawDeleteAfter: retiredAt },
      overrideAccess: true,
    });
  }
  for (const video of processed.docs) {
    if (await storage.exists("processed", String(video.processedStorageKey))) {
      await storage.remove("processed", String(video.processedStorageKey));
    }
    if (
      video.thumbnailStorageKey &&
      await storage.exists("covers", String(video.thumbnailStorageKey))
    ) await storage.remove("covers", String(video.thumbnailStorageKey));
    await api.update({
      collection: "operation-videos",
      id: video.id,
      data: {
        processedStorageKey: null,
        thumbnailStorageKey: null,
        processedDeleteAfter: retiredAt,
      },
      overrideAccess: true,
    });
  }
  return { raw: raw.docs.length, processed: processed.docs.length };
}
