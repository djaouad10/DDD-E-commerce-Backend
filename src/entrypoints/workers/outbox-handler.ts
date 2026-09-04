import { buildOutboxHandlerContainer } from "#/composition/outbox-handler-composition.js";
import { REDIS } from "#/composition/tokens.js";
import { OutboxHandlerWorker } from "#/infrastructure/messaging/bullmq/workers/outbox-handler.worker.js";
import { createLogger } from "#/shared/logging/logger.js";

const logger = createLogger("outboxHandlerEntrypoint");
const container = buildOutboxHandlerContainer();

const outboxHandlerWorker = new OutboxHandlerWorker(
  container.resolveSingleton(REDIS),
  () => container,
);

outboxHandlerWorker.start();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  try {
    await outboxHandlerWorker.stop();
    logger.info("Outbox handler processor worker stopped gracefully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", error as Error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
