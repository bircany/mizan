import { randomUUID } from "node:crypto";

import { getPayloadClient } from "../lib/payload";
import {
  deliverClaimedMessage,
  markDeliveryFailure,
} from "../lib/delivery/messages";
import { purgeExpiredDeliveryFiles } from "../lib/delivery/maintenance";
import {
  claimDeliveryMessage,
  claimDeliveryVideo,
  redactExpiredDeliveryMessages,
} from "../lib/delivery/worker-repository";
import { processDeliveryVideo } from "../lib/delivery/video-processor";

const workerId = `delivery-${randomUUID()}`;
const maxAttempts = Math.max(1, Number(process.env.DELIVERY_MAX_ATTEMPTS || 5));

async function workOnce() {
  const payload = await getPayloadClient();
  const videoId = await claimDeliveryVideo(workerId);
  if (videoId) {
    await processDeliveryVideo(payload, videoId).catch((error) => {
      console.error(`Video ${videoId} işlenemedi.`, error);
    });
    return true;
  }

  const messageId = await claimDeliveryMessage(workerId);
  if (!messageId) return false;
  try {
    await deliverClaimedMessage(payload, messageId);
  } catch (error) {
    await markDeliveryFailure(payload, messageId, error, maxAttempts);
  }
  return true;
}

async function main() {
  let idleMs = 1_000;
  let nextRedaction = 0;
  let nextFileCleanup = 0;
  for (;;) {
    const now = Date.now();
    if (now >= nextRedaction) {
      await redactExpiredDeliveryMessages().catch((error) => {
        console.error("Teslimat kişisel veri temizliği başarısız.", error);
      });
      nextRedaction = now + 60 * 60_000;
    }
    if (now >= nextFileCleanup) {
      const payload = await getPayloadClient();
      await purgeExpiredDeliveryFiles(payload).catch((error) => {
        console.error("Teslimat video temizliği başarısız.", error);
      });
      nextFileCleanup = now + 6 * 60 * 60_000;
    }
    const worked = await workOnce();
    idleMs = worked ? 100 : Math.min(idleMs * 2, 10_000);
    await new Promise((resolve) => setTimeout(resolve, idleMs));
  }
}

main().catch((error) => {
  console.error("Teslimat worker durdu.", error);
  process.exitCode = 1;
});
