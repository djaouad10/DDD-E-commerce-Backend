import { buildResetStuckOutboxRowsWorkerContainer } from "#/composition/reset-stuck-outbox-rows-worker.composition.js";
import { ResetStuckOutboxRowsWorker } from "#/infrastructure/messaging/bullmq/workers/reset-stuck-outbox-rows.worker.js";
import { createLogger } from "#/shared/logging/logger.js";

const logger = createLogger("ResetStuckOutboxRowsWorkerEntrypoint");
const container = buildResetStuckOutboxRowsWorkerContainer();

const resetStuckOutboxRowsWorker = new ResetStuckOutboxRowsWorker(container, {
  pollIntervalMs: 1000 * 60 * 60 * 3, // every 3h
  sleepAfterFailMs: 5000,
  stuckFor: 1000 * 60 * 60 * 24, // 1 days
  batchSize: 100,
});

resetStuckOutboxRowsWorker.start();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  try {
    await resetStuckOutboxRowsWorker.stop();
    logger.info("Reset stuck outbox rows worker stopped gracefully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", error as Error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
