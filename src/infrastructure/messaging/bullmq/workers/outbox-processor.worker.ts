import { buildOutboxProcessorContainer } from "#/composition/outbox-processor-composition.js";
import { OUTBOX_PROCESSOR_SERVICE } from "#/composition/tokens.js";
import { OutboxProcessorCommand } from "#/application/commands/outbox-processor.command.js";
import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";

const logger = createLogger("OutboxProcessorWorker");

async function startOutboxProcessor() {
  const container = buildOutboxProcessorContainer();

  while (true) {
    const scope = container.createScope();

    try {
      const service = scope.resolve(OUTBOX_PROCESSOR_SERVICE);
      await service.execute(new OutboxProcessorCommand(5));
    } catch (error) {
      logger.error("Outbox processor iteration failed", error as Error);
      // sleep and retry
      await sleep(5000);
    } finally {
      await scope.dispose();
    }

    await sleep(5000); // 5 seconds poll interval
  }
}

startOutboxProcessor();
