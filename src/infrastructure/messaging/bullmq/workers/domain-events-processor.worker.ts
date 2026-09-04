// // src/workers/domain-events-processor.worker.ts
// import { buildDomainEventsProcessorContainer } from "#/composition/domain-events-processor-composition.js";
// import { DOMAIN_EVENTS_PROCESSOR_SERVICE } from "#/composition/tokens.js";
// import { createLogger } from "#/shared/logging/logger.js";
// import { sleep } from "#/shared/utils/sleep.js";
// import { runWithContext } from "#/shared/context/request-context.js";
// import { DomainEventsProcessorCommand } from "#/application/commands/domain-events-processor.command.js";
// import type { Container } from "#/composition/container.js";

// const logger = createLogger("DomainEventsProcessorWorker");

// async function startDomainEventsProcessor(buildContainer: () => Container) {
//   const container = buildContainer();

//   while (true) {
//     const iterationId = `iter_${crypto.randomUUID().replace(/-/g, "")}`;

//     await runWithContext(
//       { requestId: iterationId, startTime: performance.now() },
//       async () => {
//         const scope = container.createScope();

//         try {
//           const service = scope.resolve(DOMAIN_EVENTS_PROCESSOR_SERVICE);
//           await service.execute(new DomainEventsProcessorCommand(5));
//         } catch (error) {
//           logger.error(
//             "Domain events processor iteration failed",
//             error as Error,
//           );
//           await sleep(5000);
//         } finally {
//           await scope.dispose();
//         }
//       },
//     );

//     await sleep(5000);
//   }
// }

// startDomainEventsProcessor(buildDomainEventsProcessorContainer);

import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";
import { runWithContext } from "#/shared/context/request-context.js";
import type { Container } from "#/composition/container.js";
import { DOMAIN_EVENTS_PROCESSOR_SERVICE } from "#/composition/tokens.js";
import { DomainEventsProcessorCommand } from "#/application/commands/domain-events-processor/domain-events-processor.command.js";

const logger = createLogger("DomainEventsProcessorWorker");

export type DomainEventsProcessorWorkerOptions = {
  pollIntervalMs: number;
  sleepAfterFailMs: number;
  maxPublicationAttempts: number;
  batchSize: number;
};

export const DomainEventsProcessorWorkerOptions: DomainEventsProcessorWorkerOptions =
  {
    pollIntervalMs: 1000 * 60 * 60 * 24, // 1 day
    sleepAfterFailMs: 5000,
    maxPublicationAttempts: 5,
    batchSize: 100,
  };

export class DomainEventsProcessorWorker {
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private abortController = new AbortController();

  constructor(
    private container: Container,
    private options: DomainEventsProcessorWorkerOptions = DomainEventsProcessorWorkerOptions,
  ) {}

  /** Runs exactly one iteration. Exposed directly so tests can call it
   *  without going through the infinite loop. */
  async runIteration(): Promise<void> {
    const iterationId = `iter_${crypto.randomUUID().replace(/-/g, "")}`;

    await runWithContext(
      { requestId: iterationId, startTime: performance.now() },
      async () => {
        const scope = this.container.createScope();

        try {
          const service = scope.resolve(DOMAIN_EVENTS_PROCESSOR_SERVICE);
          await service.execute(
            new DomainEventsProcessorCommand(
              this.options.maxPublicationAttempts,
              this.options.batchSize,
            ),
          );
        } finally {
          await scope.dispose();
        }
      },
    );
  }

  /** Starts the loop in the background. Returns immediately. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.abortController = new AbortController(); // fresh controller per run
    logger.info("Domain events processor worker started");
    this.loopPromise = this.loop();
  }

  /** Signals the loop to stop and waits for the current sleep/iteration to unwind. */
  async stop(): Promise<void> {
    this.running = false;
    this.abortController.abort();
    await this.loopPromise;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.runIteration();
      } catch (error) {
        logger.error("Outbox processor iteration failed", error as Error);
        await sleep(this.options.sleepAfterFailMs, this.abortController.signal);
        continue;
      }

      await sleep(this.options.pollIntervalMs, this.abortController.signal);
    }
  }
}
