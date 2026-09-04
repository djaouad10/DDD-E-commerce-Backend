import { buildDomainEventsProcessorContainer } from "#/composition/roots/domain-events-processor.composition.js";
import { DomainEventsProcessorWorker } from "#/infrastructure/messaging/bullmq/workers/domain-events-processor.worker.js";
import { createLogger } from "#/shared/logging/logger.js";

const logger = createLogger("domainEventsProcessorEntrypoint");
const container = buildDomainEventsProcessorContainer();

const domainEventsProcessor = new DomainEventsProcessorWorker(container, {
  pollIntervalMs: 1000 * 60 * 3, // 3 minutes
  sleepAfterFailMs: 5000,
  maxPublicationAttempts: 5,
  batchSize: 40,
});

domainEventsProcessor.start();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  try {
    await domainEventsProcessor.stop();
    logger.info("Domain events processor worker stopped gracefully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", error as Error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
