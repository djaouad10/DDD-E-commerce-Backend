import { buildResetStuckConvosWorkerContainer } from "#/composition/roots/reset-stuck-convos-worker.composition.js";
import { ResetStuckConvosWorker } from "#/infrastructure/messaging/bullmq/workers/reset-stuck-convos.worker.js";
import { createLogger } from "#/shared/logging/logger.js";

const logger = createLogger("ResetStuckConvosWorkerEntrypoint");
const container = buildResetStuckConvosWorkerContainer();

const resetStuckConvosWorker = new ResetStuckConvosWorker(container, {
  pollIntervalMs: 1000 * 60 * 10, // 10 mins
  sleepAfterFailMs: 5000,
  stuckforMs: 1000 * 60 * 10, // 10 mins
  batchSize: 50,
});

resetStuckConvosWorker.start();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  try {
    await resetStuckConvosWorker.stop();
    logger.info("Reset stuck convos worker stopped gracefully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", error as Error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
