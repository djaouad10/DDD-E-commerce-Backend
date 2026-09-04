import { buildCleanOutboxContainer } from "#/composition/roots/clean-outbox-worker.composition.js";
import { CleanOutboxWorker } from "#/infrastructure/messaging/bullmq/workers/clean-outbox.worker.js";
import { createLogger } from "#/shared/logging/logger.js";

const logger = createLogger("CleanOutboxWorkerEntrypoint");
const container = buildCleanOutboxContainer();

const cleanOutboxWorker = new CleanOutboxWorker(container, {
  pollIntervalMs: 1000 * 60 * 60 * 24, // 1 day
  sleepAfterFailMs: 5000,
  retentionMs: 5 * 24 * 60 * 60 * 1000, // 5 days
});

cleanOutboxWorker.start();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  try {
    await cleanOutboxWorker.stop();
    logger.info("Clean outbox worker stopped gracefully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", error as Error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
