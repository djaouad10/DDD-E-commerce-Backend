import { createLogger } from "#/shared/logging/logger.js";
import { Worker } from "bullmq";
import type { Redis } from "ioredis";
import { BadRequestError, ValidationError } from "#/shared/errors/errors.js";

import { runWithContext } from "#/shared/context/request-context.js";
import { buildEmbeddingQueueHandlerContainer } from "#/composition/roots/embedding-queue-handler.composition.js";
import {
  buildEmbeddingQueueEventCommand,
  executeEmbeddingQueueEventHandler,
  type EmbeddingQueueDomainEvents,
} from "../../jobs/embedding-handler-utils.js";
import {
  domainEventsPayloadSchemas,
  type EmbeddingDomainEventsPayloadTypes,
} from "../../jobs/validation.js";
import type { Container } from "#/composition/utils/container.js";

export class EmbeddingQueueHandlerWorker {
  private logger = createLogger("EmbeddingQueueHandlerWorker");
  private worker: Worker | null = null;

  constructor(
    private connection: Redis,
    private buildContainer: () => Container = buildEmbeddingQueueHandlerContainer,
  ) {}

  start(): void {
    if (this.worker) {
      this.logger.warn("Worker already started, skipping.");
      return;
    }

    this.worker = new Worker(
      "embedding-queue",
      async (job) => {
        const requestId = `job_${job.id}`;

        return runWithContext(
          {
            requestId,
            jobId: job.id ?? "unknown",
            queueName: "embedding-queue",
            startTime: performance.now(),
          },
          async () => {
            const container = this.buildContainer();
            const scope = container.createScope();

            const jobId = job.id;
            const eventCode = job.name as EmbeddingQueueDomainEvents;

            this.logger.info("Processing embedding queue job", {
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
              ) as EmbeddingDomainEventsPayloadTypes<typeof eventCode>;

              // 2. Build typed command
              const command = buildEmbeddingQueueEventCommand(
                eventCode,
                payload,
              );

              // 3. Resolve service & execute (fully typed end-to-end)
              await executeEmbeddingQueueEventHandler(
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

    this.logger.info("EmbeddingQueueHandlerWorker started");
  }

  async stop(): Promise<void> {
    if (!this.worker) return;
    await this.worker.close();
    this.worker = null;
    this.logger.info("EmbeddingQueueHandlerWorker stopped");
  }
}
