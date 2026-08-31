import {
  OutboxStatus,
  type OutboxRepository,
} from "../repositories/outbox.repository.js";
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
      try {
        await this.outboxRepository.updateRow({
          id: job.id,
          status: OutboxStatus.PROCESSING,
        });

        this.logger.debug("Processing event job", { id: job.id });

        await this.eventPublisher.publish(job.eventType, job.payload, job.id);

        this.logger.debug("Event job added to queues", { id: job.id });

        await this.outboxRepository.updateRow({
          id: job.id,
          status: OutboxStatus.COMPLETED,
          processedAt: new Date(),
          attempts: job.attempts + 1,
        });

        this.logger.debug("Event job completed", { id: job.id });
      } catch (error) {
        this.logger.error("Event job failed", error as Error, { id: job.id });
        const nextAttempts = job.attempts + 1;

        if (nextAttempts >= command.maxPublicationAttempts) {
          await this.outboxRepository.updateRow({
            id: job.id,
            attempts: nextAttempts,
            status: OutboxStatus.FAILED,
            processedAt: new Date(),
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          });

          this.logger.debug("Event job max attempts reached", { id: job.id });
        } else {
          const retryDelayMs = Math.pow(2, nextAttempts) * 1000;
          const nextRetryAt = new Date(Date.now() + retryDelayMs);

          await this.outboxRepository.updateRow({
            id: job.id,
            attempts: nextAttempts,
            status: OutboxStatus.PENDING,
            scheduledAt: nextRetryAt,
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          });

          this.logger.debug("Event job scheduled for retry", {
            id: job.id,
            scheduledAt: nextRetryAt,
          });
        }
      }
    }
  }
}
