// src/workers/domain-events-processor.worker.ts
import { buildDomainEventsProcessorContainer } from "#/composition/domain-events-processor-composition.js";
import { DOMAIN_EVENTS_PROCESSOR_SERVICE } from "#/composition/tokens.js";
import { OutboxProcessorCommand } from "#/application/commands/outbox-processor.command.js";
import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";

const logger = createLogger("DomainEventsProcessorWorker");

async function startDomainEventsProcessor() {
  const container = buildDomainEventsProcessorContainer();

  while (true) {
    const scope = container.createScope();

    try {
      const service = scope.resolve(DOMAIN_EVENTS_PROCESSOR_SERVICE);
      await service.execute(new OutboxProcessorCommand(5));
    } catch (error) {
      logger.error("Domain events processor iteration failed", error as Error);
      await sleep(5000);
    } finally {
      await scope.dispose();
    }

    await sleep(5000);
  }
}

startDomainEventsProcessor();
