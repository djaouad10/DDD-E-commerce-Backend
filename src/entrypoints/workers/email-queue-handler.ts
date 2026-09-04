import { buildEmailQueueHandlerContainer } from "#/composition/roots/email-queue-handler.composition.js";
import { REDIS } from "#/composition/utils/tokens.js";
import { EmailQueueHandlerWorker } from "#/infrastructure/messaging/bullmq/workers/email-queue-handler.worker.js";
import { createLogger } from "#/shared/logging/logger.js";

const logger = createLogger("emailQueueHandlerEntrypoint");
const container = buildEmailQueueHandlerContainer();

const emailQueueHandlerWorker = new EmailQueueHandlerWorker(
  container.resolveSingleton(REDIS),
  () => container,
);

emailQueueHandlerWorker.start();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  try {
    await emailQueueHandlerWorker.stop();
    logger.info("Email queue processor worker stopped gracefully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", error as Error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
