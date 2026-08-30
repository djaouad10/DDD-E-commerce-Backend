import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";
import { runWithContext } from "#/shared/context/request-context.js";
import type { Container } from "#/composition/container.js";
import { buildCleanOutboxContainer } from "#/composition/clean-outbox-worker.composition.js";
import { CLEAN_OUTBOX_SERVICE } from "#/composition/tokens.js";
import { CleanOutboxCommand } from "#/application/commands/clean-outbox.command.js";

const logger = createLogger("CleanOutboxWorker");

async function startCleanOutboxWorker(buildContainer: () => Container) {
  const container = buildContainer();

  while (true) {
    const iterationId = `iter_${crypto.randomUUID().replace(/-/g, "")}`;

    await runWithContext(
      { requestId: iterationId, startTime: performance.now() },
      async () => {
        const scope = container.createScope();

        try {
          const service = scope.resolve(CLEAN_OUTBOX_SERVICE);

          const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

          await service.execute(new CleanOutboxCommand(fiveDaysAgo));
        } catch (error) {
          logger.error("Clean outbox iteration failed", error as Error);
          // sleep and retry
          await sleep(5000);
        } finally {
          await scope.dispose();
        }
      },
    );

    await sleep(1000 * 60 * 60 * 24); // 1 day poll interval
  }
}

startCleanOutboxWorker(buildCleanOutboxContainer);
