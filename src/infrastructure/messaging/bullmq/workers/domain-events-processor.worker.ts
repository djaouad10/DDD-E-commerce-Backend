// src/workers/domain-events-processor.worker.ts
import { buildDomainEventsProcessorContainer } from "#/composition/domain-events-processor-composition.js";
import { DOMAIN_EVENTS_PROCESSOR_SERVICE } from "#/composition/tokens.js";
import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";
import { runWithContext } from "#/shared/context/request-context.js";
import { DomainEventsProcessorCommand } from "#/application/commands/domain-events-processor.command.js";

const logger = createLogger("DomainEventsProcessorWorker");

async function startDomainEventsProcessor() {
  const container = buildDomainEventsProcessorContainer();

  while (true) {
    const iterationId = `iter_${crypto.randomUUID().replace(/-/g, "")}`;

    await runWithContext(
      { requestId: iterationId, startTime: performance.now() },
      async () => {
        const scope = container.createScope();

        try {
          const service = scope.resolve(DOMAIN_EVENTS_PROCESSOR_SERVICE);
          await service.execute(new DomainEventsProcessorCommand(5));
        } catch (error) {
          logger.error(
            "Domain events processor iteration failed",
            error as Error,
          );
          await sleep(5000);
        } finally {
          await scope.dispose();
        }
      },
    );

    await sleep(5000);
  }
}

startDomainEventsProcessor();
