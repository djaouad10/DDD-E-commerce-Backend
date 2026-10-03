import { createLogger } from "#/shared/logging/logger.js";
import { sleep } from "#/shared/utils/sleep.js";
import { runWithContext } from "#/shared/context/request-context.js";
import type { Container } from "#/composition/utils/container.js";
import { RESET_STUCK_CONVOS_SERVICE } from "#/composition/utils/tokens.js";
import { ResetStuckConvosCommand } from "#/application/commands/stuck-convos-resetter/reset-stuck-convos.command.js";

const logger = createLogger("ResetStuckConvosWorker");

export type ResetStuckConvosWorkerOptions = {
  pollIntervalMs: number;
  sleepAfterFailMs: number;
  stuckforMs: number;
  batchSize: number;
};

export const defaultResetStuckConvosWorkerOptions: ResetStuckConvosWorkerOptions =
  {
    pollIntervalMs: 1000 * 60 * 10, // 10 mins
    sleepAfterFailMs: 5000,
    stuckforMs: 1000 * 60 * 10, // 10 mins
    batchSize: 50,
  };

export class ResetStuckConvosWorker {
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private abortController = new AbortController();

  constructor(
    private container: Container,
    private options: ResetStuckConvosWorkerOptions = defaultResetStuckConvosWorkerOptions,
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
          const service = scope.resolve(RESET_STUCK_CONVOS_SERVICE);

          await service.execute(
            new ResetStuckConvosCommand(
              this.options.batchSize,
              this.options.stuckforMs,
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
    logger.info("Reset stuck convos worker started");
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
        logger.error("Reset stuck convos iteration failed", error as Error);
        await sleep(this.options.sleepAfterFailMs, this.abortController.signal);
        continue;
      }

      await sleep(this.options.pollIntervalMs, this.abortController.signal);
    }
  }
}
