import { retentionConfig, storageConfig } from "./config.js";
import { heartbeat } from "./heartbeat.js";
import { logger } from "./logger.js";
import { runRetentionCycle } from "./retention.js";
import { installShutdown } from "./shutdown.js";
import { ensureStorageDirectories } from "./storage.js";

const storage = storageConfig();
const config = retentionConfig();
const abortController = new AbortController();
const heartbeatPath = process.env.HEALTH_FILE || "/tmp/mizan-retention-worker.health";

function sleep(milliseconds) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    abortController.signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

await ensureStorageDirectories(storage);
await heartbeat(heartbeatPath);
installShutdown(abortController);
logger.info("Retention and disk monitor started", { intervalMs: config.intervalMs });

while (!abortController.signal.aborted) {
  try {
    await heartbeat(heartbeatPath);
    const result = await runRetentionCycle(storage, config);
    logger.info("Retention cycle completed", result);
    await heartbeat(heartbeatPath);
  } catch (error) {
    logger.error("Retention cycle failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  await sleep(config.intervalMs);
}
