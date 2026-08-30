import { OUTBOX_PROCESSOR_SERVICE } from "#/composition/tokens.js";
import { OutboxProcessorCommand } from "#/application/commands/outbox-processor.command.js";
import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";
import { runWithContext } from "#/shared/context/request-context.js";
import type { Container } from "#/composition/container.js";

const logger = createLogger("OutboxProcessorWorker");

export type OutboxProcessorWorkerOptions = {
  pollIntervalMs: number;
  sleepAfterFailMs: number;
  maxPublicationAttempts: number;
  batchSize: number;
};

export const defaultOutboxProcessorWorkerOptions: OutboxProcessorWorkerOptions =
  {
    pollIntervalMs: 1000 * 60 * 60 * 24, // 1 day
    sleepAfterFailMs: 5000,
    maxPublicationAttempts: 5,
    batchSize: 100,
  };

export class OutboxProcessorWorker {
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private abortController = new AbortController();

  constructor(
    private container: Container,
    private options: OutboxProcessorWorkerOptions = defaultOutboxProcessorWorkerOptions,
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
          const service = scope.resolve(OUTBOX_PROCESSOR_SERVICE);
          await service.execute(
            new OutboxProcessorCommand(
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
