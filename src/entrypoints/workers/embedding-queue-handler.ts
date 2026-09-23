import { buildEmbeddingQueueHandlerContainer } from "#/composition/roots/embedding-queue-handler.composition.js";
import { REDIS } from "#/composition/utils/tokens.js";
import { EmbeddingQueueHandlerWorker } from "#/infrastructure/messaging/bullmq/workers/embedding-queue-handler.worker.js";
import { createLogger } from "#/shared/logging/logger.js";

const logger = createLogger("EmbeddingQueueHandlerEntrypoint");
const container = buildEmbeddingQueueHandlerContainer();

const embeddingQueueHandlerWorker = new EmbeddingQueueHandlerWorker(
  container.resolveSingleton(REDIS),
  () => container,
);

embeddingQueueHandlerWorker.start();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  try {
    await embeddingQueueHandlerWorker.stop();
    logger.info("Embedding queue processor worker stopped gracefully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", error as Error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
