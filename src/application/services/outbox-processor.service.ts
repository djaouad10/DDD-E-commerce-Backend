import type { Queue } from "bullmq";
import {
  OutboxStatus,
  type OutboxRepository,
} from "../repositories/outbox.repository.js";
import type { OutboxProcessorCommand } from "../commands/outbox-processor.command.js";
import { createLogger } from "#/shared/logging/logger.js";

export class OutboxProcessorService {
  private logger = createLogger("OutboxProcessorService");
  constructor(
    private outboxRepository: OutboxRepository,
    private outboxQueue: Queue,
  ) {}

  async execute(command: OutboxProcessorCommand) {
    // should I wrap the try block in a tx?

    this.logger.debug("Processing outbox jobs");
    const pendingJobs = await this.outboxRepository.getPendingJobs(10);

    this.logger.debug("Found pending jobs", { count: pendingJobs.length });
    if (pendingJobs.length === 0) return;

    for (const job of pendingJobs) {
      try {
        await this.outboxRepository.updateRow({
          id: job.id,
          status: OutboxStatus.PROCESSING,
        });

        this.logger.debug("Processing outbox job", { id: job.id });

        await this.outboxQueue.add(job.eventType, job.payload, {
          jobId: job.id,
          attempts: 5, // BullMQ execution retry configuration (Independent of DB)
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        });

        this.logger.debug("Outbox job added to queue", { id: job.id });

        await this.outboxRepository.updateRow({
          id: job.id,
          status: OutboxStatus.COMPLETED,
          processedAt: new Date(),
        });

        this.logger.debug("Outbox job completed", { id: job.id });
      } catch (error) {
        this.logger.error("Outbox job failed", error as Error, { id: job.id });
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

          this.logger.debug("outbox job max attempts reached", { id: job.id });
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

          this.logger.debug("outbox job scheduled for retry", {
            id: job.id,
            scheduledAt: nextRetryAt,
          });
        }
      }
    }
  }
}
