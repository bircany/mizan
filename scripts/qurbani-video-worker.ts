import { randomUUID } from "node:crypto";

import { getPayloadClient } from "../lib/payload";
import { deliverQueuedQurbaniMessage } from "../lib/qurbani/service";
import { processQurbaniVideo } from "../lib/qurbani/video-processor";
import {
  expireQurbaniReservations,
  purgeExpiredQurbaniCheckoutPii,
} from "../lib/qurbani/orders";
import { qurbaniQuery } from "../lib/qurbani/db";

const workerId = `qurbani-${randomUUID()}`;

async function claimJob(type: "process_video" | "send_whatsapp") {
  const payload = await getPayloadClient();
  const claimed = await qurbaniQuery<{ id: number | null }>("select private.qurbani_claim_job($1::text, $2::public.enum_qurbani_jobs_type) as id", [workerId, type]);
  const jobId = claimed.rows[0]?.id;
  if (!jobId) return null;
  return payload.findByID({ collection: "qurbani-jobs", id: jobId, depth: 0, overrideAccess: true });
}

async function workOnce() {
  const payload = await getPayloadClient();
  const job = await claimJob("process_video") || await claimJob("send_whatsapp");
  if (!job) return false;
  try {
    if (job.type === "process_video") {
      const videoId = typeof job.video === "object" && job.video ? job.video.id : job.video;
      if (!videoId) throw new Error("Video isi video kaydina bagli degil.");
      await processQurbaniVideo(payload, videoId);
    } else if (job.type === "send_whatsapp") {
      const messageId = typeof job.message === "object" && job.message ? job.message.id : job.message;
      if (!messageId) throw new Error("WhatsApp isi mesaj kaydina bagli degil.");
      await deliverQueuedQurbaniMessage(payload, messageId);
    } else {
      throw new Error(`Desteklenmeyen worker isi: ${job.type}`);
    }
    await payload.update({ collection: "qurbani-jobs", id: job.id, data: { status: "completed", completedAt: new Date().toISOString(), lastError: null }, overrideAccess: true });
  } catch (error) {
    const attempts = Number(job.attemptCount || 0) + 1;
    const terminal = attempts >= Number(job.maxAttempts || 5);
    await payload.update({ collection: "qurbani-jobs", id: job.id, data: { status: terminal ? "dead" : "queued", attemptCount: attempts, runAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** attempts) * 1000).toISOString(), lockedAt: null, lockedBy: null, lastError: error instanceof Error ? error.message.slice(0, 1000) : "Worker hatasi." }, overrideAccess: true });
  }
  return true;
}

async function main() {
  let idleMs = 1000;
  let nextReservationSweep = 0;
  let nextPiiSweep = 0;
  for (;;) {
    if (Date.now() >= nextReservationSweep) {
      await expireQurbaniReservations().catch((error) => console.error("Kurban rezervasyon temizligi basarisiz.", error));
      nextReservationSweep = Date.now() + 60_000;
    }
    if (Date.now() >= nextPiiSweep) {
      await purgeExpiredQurbaniCheckoutPii().catch((error) =>
        console.error("Kurban geçici kişi verisi temizliği başarısız.", error),
      );
      nextPiiSweep = Date.now() + 60 * 60_000;
    }
    const worked = await workOnce();
    idleMs = worked ? 100 : Math.min(idleMs * 2, 10_000);
    await new Promise((resolve) => setTimeout(resolve, idleMs));
  }
}

main().catch((error) => {
  console.error("Kurban video worker durdu.", error);
  process.exitCode = 1;
});
