import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";
import { runWithContext } from "#/shared/context/request-context.js";
import type { Container } from "#/composition/utils/container.js";
import { RESET_STUCK_OUTBOX_ROWS_SERVICE } from "#/composition/utils/tokens.js";
import { ResetStuckOutboxRowsCommand } from "#/application/commands/stuck-outbox-resetter/reset-stuck-outbox-rows.command.js";

const logger = createLogger("ResetStuckOutboxRowsWorker");

export type ResetStuckOutboxRowsWorkerOptions = {
  pollIntervalMs: number;
  sleepAfterFailMs: number;
  stuckFor: number;
  batchSize: number;
};

export const defaultResetStuckOutboxRowsWorkerOptions: ResetStuckOutboxRowsWorkerOptions =
  {
    pollIntervalMs: 1000 * 60 * 60 * 24, // 1 day
    sleepAfterFailMs: 5000,
    stuckFor: 1000 * 60 * 60 * 24, // 1 days
    batchSize: 100,
  };

export class ResetStuckOutboxRowsWorker {
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private abortController = new AbortController();

  constructor(
    private container: Container,
    private options: ResetStuckOutboxRowsWorkerOptions = defaultResetStuckOutboxRowsWorkerOptions,
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
          const service = scope.resolve(RESET_STUCK_OUTBOX_ROWS_SERVICE);
          const stuckBefore = new Date(Date.now() - this.options.stuckFor);

          await service.execute(
            new ResetStuckOutboxRowsCommand(
              this.options.batchSize,
              stuckBefore,
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
    logger.info("Reset stuck outbox rows worker started");
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
        logger.error(
          "Reset stuck outbox rows iteration failed",
          error as Error,
        );
        await sleep(this.options.sleepAfterFailMs, this.abortController.signal);
        continue;
      }

      await sleep(this.options.pollIntervalMs, this.abortController.signal);
    }
  }
}
