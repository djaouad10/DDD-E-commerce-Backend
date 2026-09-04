import type { Queue } from "bullmq";
import { type OutboxRepository } from "../repositories/outbox.repository.js";
import type { OutboxProcessorCommand } from "../commands/outbox-processor/outbox-processor.command.js";
import { createLogger } from "#/shared/logging/logger.js";

export class OutboxProcessorService {
  private logger = createLogger("OutboxProcessorService");
  constructor(
    private outboxRepository: OutboxRepository,
    private outboxQueue: Queue,
  ) {}

  async execute(command: OutboxProcessorCommand) {
    this.logger.debug("Processing outbox jobs");
    const pendingJobs = await this.outboxRepository.getPendingJobs(
      command.batchSize,
    );

    this.logger.debug("Found pending jobs", { count: pendingJobs.length });
    if (pendingJobs.length === 0) return;

    for (const job of pendingJobs) {
      const attempt = job.attempts + 1;

      try {
        const claimed = await this.outboxRepository.updateRowToProcessing({
          id: job.id,
          attempts: attempt,
        });

        if (!claimed) {
          this.logger.debug("Outbox job not claimed", { id: job.id, attempt });
          continue;
        }
      } catch (error) {
        this.logger.error("Failed to claim outbox job", error as Error, {
          id: job.id,
          attempt,
        });
        continue;
      }

      this.logger.debug("Processing outbox job", { id: job.id, attempt });

      try {
        await this.outboxQueue.add(job.eventType, job.payload, {
          jobId: job.id,
          attempts: 5, // BullMQ execution retry configuration (Independent of DB)
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        });

        this.logger.debug("Outbox job added to queue", { id: job.id, attempt });
      } catch (error) {
        this.logger.error("Failed to publish outbox job", error as Error, {
          id: job.id,
          attempt,
        });

        try {
          await this.handlePublishFailure(job.id, attempt, error, command);
        } catch (error) {
          // If this.handlePublishFailure fails, the job is not yet published to the queue and the DB still says PROCESSING.
          // reset-stuck-outbox-jobs worker will eventually reset it and job will be republished. Since consumers are idempotent: the duplicate delivery is harmless (at-least-once semantics)
          this.logger.error(
            "Job published but failed to mark FAILED/PENDING in DB. Will be reset by stuck-row recovery.",
            error as Error,
            { id: job.id },
          );
        }

        continue;
      }

      try {
        await this.outboxRepository.updateRowToCompleted({
          id: job.id,
          processedAt: new Date(),
        });

        this.logger.debug("Outbox job completed", { id: job.id });
      } catch (error) {
        // If this.handlePublishFailure fails, the job is not yet published to the queue and the DB still says PROCESSING.
        // reset-stuck-outbox-jobs worker will eventually reset it and job will be republished. Since consumers are idempotent: the duplicate delivery is harmless (at-least-once semantics)

        this.logger.error(
          "Job published but failed to mark COMPLETED in DB. Will be reset by stuck-row recovery.",
          error as Error,
          { id: job.id },
        );
      }
    }
  }

  private async handlePublishFailure(
    jobId: string,
    attempt: number,
    error: unknown,
    command: OutboxProcessorCommand,
  ) {
    if (attempt >= command.maxPublicationAttempts) {
      await this.outboxRepository.updateRowToFailed({
        id: jobId,
        processedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      this.logger.debug("outbox job max attempts reached", {
        id: jobId,
        attempt,
      });
    } else {
      const retryDelayMs = Math.pow(2, attempt) * 1000;
      const nextRetryAt = new Date(Date.now() + retryDelayMs);

      await this.outboxRepository.updateRowToPending({
        id: jobId,
        scheduledAt: nextRetryAt,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      this.logger.debug("outbox job scheduled for retry", {
        id: jobId,
        scheduledAt: nextRetryAt,
      });
    }
  }
}
