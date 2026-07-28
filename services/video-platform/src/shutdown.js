import { closePool } from "./db.js";
import { logger } from "./logger.js";

export function installShutdown(signalController) {
  let stopping = false;
  const stop = async (signal) => {
    if (stopping) return;
    stopping = true;
    logger.info("Graceful shutdown requested", { signal });
    signalController?.abort();
    const timer = setTimeout(() => process.exit(1), 15_000);
    timer.unref();
    await closePool().catch((error) => logger.error("Database shutdown failed", { error: error.message }));
    process.exit(0);
  };
  process.once("SIGTERM", () => void stop("SIGTERM"));
  process.once("SIGINT", () => void stop("SIGINT"));
}
