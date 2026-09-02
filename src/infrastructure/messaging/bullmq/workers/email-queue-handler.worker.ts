import { createLogger } from "#/shared/logging/logger.js";
import { Worker } from "bullmq";
import type { Redis } from "ioredis";
import {
  BadRequestError,
  ValidationError,
} from "#/shared/errors/domain-error.js";

import { runWithContext } from "#/shared/context/request-context.js";
import { buildEmailQueueHandlerContainer } from "#/composition/email-queue-handler.composition.js";
import {
  buildEmailQueueEventCommand,
  executeEmailQueueEventHandler,
  type EmailQueueDomainEvents,
} from "../../jobs/email-handler-utils.js";
import {
  domainEventsPayloadSchemas,
  type DomainEventsPayloadTypes,
} from "../../jobs/validation.js";
import type { Container } from "#/composition/container.js";

export class EmailQueueHandlerWorker {
  private logger = createLogger("EmailQueueHandlerWorker");
  private worker: Worker | null = null;

  constructor(
    private connection: Redis,
    private buildContainer: () => Container = buildEmailQueueHandlerContainer,
  ) {}

  start(): void {
    if (this.worker) {
      this.logger.warn("Worker already started, skipping.");
      return;
    }

    this.worker = new Worker(
      "email-queue",
      async (job) => {
        const requestId = `job_${job.id}`;

        return runWithContext(
          {
            requestId,
            jobId: job.id ?? "unknown",
            queueName: "email-queue",
            startTime: performance.now(),
          },
          async () => {
            const container = this.buildContainer();
            const scope = container.createScope();

            const jobId = job.id;
            const eventCode = job.name as EmailQueueDomainEvents;

            this.logger.info("Processing email queue job", {
              jobId,
              eventCode,
            });

            if (!jobId) throw new BadRequestError("jobId is required");

            try {
              // 1. Schema lookup + validation
              const payloadSchema = domainEventsPayloadSchemas.shape[eventCode];

              if (!payloadSchema) {
                throw new ValidationError(
                  "Domain Event",
                  `Invalid Domain Event: ${eventCode}`,
                );
              }

              const payload = payloadSchema.parse(
                job.data,
              ) as DomainEventsPayloadTypes<typeof eventCode>;

              // 2. Build typed command
              const command = buildEmailQueueEventCommand(eventCode, payload);

              // 3. Resolve service & execute (fully typed end-to-end)
              await executeEmailQueueEventHandler(
                eventCode,
                scope,
                command,
                jobId,
              );

              this.logger.info("Domain Event job completed", {
                jobId,
                eventCode,
              });
            } catch (error) {
              this.logger.error("Domain Event job failed", error as Error, {
                jobId,
                eventCode,
                error,
              });
              throw error; // BullMQ handles retries / dead-letter
            } finally {
              await scope.dispose();
            }
          },
        );
      },
      {
        connection: this.connection,
        concurrency: 3,
        lockDuration: 30000,
        stalledInterval: 30000,
      },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error("BullMQ job failed", err, {
        jobId: job?.id,
        error: err,
      });
    });

    this.worker.on("stalled", (jobId) => {
      this.logger.warn("BullMQ job stalled", { jobId });
    });

    this.logger.info("EmailQueueHandlerWorker started");
  }

  async stop(): Promise<void> {
    if (!this.worker) return;
    await this.worker.close();
    this.worker = null;
    this.logger.info("EmailQueueHandlerWorker stopped");
  }
}
