import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";
import { runWithContext } from "#/shared/context/request-context.js";
import type { Container } from "#/composition/container.js";
import { CLEAN_OUTBOX_SERVICE } from "#/composition/tokens.js";
import { CleanOutboxCommand } from "#/application/commands/clean-outbox.command.js";

const logger = createLogger("CleanOutboxWorker");

export type CleanOutboxWorkerOptions = {
  pollIntervalMs: number;
  sleepAfterFailMs: number;
  retentionMs: number;
};

export const defaultCleanOutboxWorkerOptions: CleanOutboxWorkerOptions = {
  pollIntervalMs: 1000 * 60 * 60 * 24, // 1 day
  sleepAfterFailMs: 5000,
  retentionMs: 5 * 24 * 60 * 60 * 1000, // 5 days
};

export class CleanOutboxWorker {
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private abortController = new AbortController();

  constructor(
    private container: Container,
    private options: CleanOutboxWorkerOptions = defaultCleanOutboxWorkerOptions,
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
          const service = scope.resolve(CLEAN_OUTBOX_SERVICE);
          const cutoff = new Date(Date.now() - this.options.retentionMs);

          await service.execute(new CleanOutboxCommand(cutoff));
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
    logger.info("Clean outbox worker started");
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
        logger.error("Clean outbox iteration failed", error as Error);
        await sleep(this.options.sleepAfterFailMs, this.abortController.signal);
        continue;
      }

      await sleep(this.options.pollIntervalMs, this.abortController.signal);
    }
  }
}
