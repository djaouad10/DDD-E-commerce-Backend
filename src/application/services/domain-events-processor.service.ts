import { type OutboxRepository } from "../repositories/outbox.repository.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { EventPublisher } from "../ports/event-publisher.port.js";
import type { DomainEventsProcessorCommand } from "../commands/domain-events-processor.command.js";

export class DomainEventsProcessorService {
  private logger = createLogger("DomainEventsProcessorService");
  constructor(
    private outboxRepository: OutboxRepository,
    private eventPublisher: EventPublisher,
  ) {}

  async execute(command: DomainEventsProcessorCommand) {
    this.logger.debug("Processing event jobs");
    const pendingJobs = await this.outboxRepository.getPendingEvents(
      command.batchSize,
    );

    this.logger.debug("Found pending jobs", { count: pendingJobs.length });
    if (pendingJobs.length === 0) return;

    for (const job of pendingJobs) {
      const attempt = job.attempts + 1;

      const claimed = await this.outboxRepository.updateRowToProcessing({
        id: job.id,
        attempts: attempt,
      });

      if (!claimed) {
        this.logger.debug("Event job not claimed", { id: job.id, attempt });
        continue;
      }

      this.logger.debug("Processing event job", { id: job.id });

      try {
        await this.eventPublisher.publish(job.eventType, job.payload, job.id);

        this.logger.debug("Event job added to queues", { id: job.id });
      } catch (error) {
        this.logger.error("Failed to publish event job", error as Error, {
          id: job.id,
          attempt,
        });

        await this.handlePublishFailure(job.id, attempt, error, command);

        // If this.handlePublishFailure fails, the job is not yet published to the queue and the DB still says PROCESSING.
        // reset-stuck-outbox-jobs worker will eventually reset it and job will be republished. Since consumers are idempotent: the duplicate delivery is harmless (at-least-once semantics)

        continue;
      }

      try {
        await this.outboxRepository.updateRowToCompleted({
          id: job.id,
          processedAt: new Date(),
        });

        this.logger.debug("Event job completed", { id: job.id });
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
    command: DomainEventsProcessorCommand,
  ) {
    if (attempt >= command.maxPublicationAttempts) {
      await this.outboxRepository.updateRowToFailed({
        id: jobId,
        processedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      this.logger.debug("Event job max attempts reached", { id: jobId });
    } else {
      const retryDelayMs = Math.pow(2, attempt) * 1000;
      const nextRetryAt = new Date(Date.now() + retryDelayMs);

      await this.outboxRepository.updateRowToPending({
        id: jobId,
        scheduledAt: nextRetryAt,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      this.logger.debug("Event job scheduled for retry", {
        id: jobId,
        scheduledAt: nextRetryAt,
      });
    }
  }
}
