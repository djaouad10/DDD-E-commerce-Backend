import { createLogger } from "#/shared/logging/logger.js";
import { Worker } from "bullmq";
import type { Redis } from "ioredis";
import {
  BadRequestError,
  ValidationError,
} from "#/shared/errors/domain-error.js";
import { buildOutboxHandlerContainer } from "#/composition/outbox-handler-composition.js";

import {
  outboxJobPayloadsSchemas,
  type OutboxJobPayloadType,
} from "../../jobs/validation.js";
import type { OutboxAction } from "#/application/repositories/outbox.repository.js";
import { buildOutboxCommand, executeOutboxHandler } from "../../jobs/utils.js";
import { runWithContext } from "#/shared/context/request-context.js";

export class OutboxHandlerWorker {
  private logger = createLogger("OutboxHandlerWorker");
  private worker: Worker | null = null;

  constructor(private connection: Redis) {}

  start(): void {
    if (this.worker) {
      this.logger.warn("Worker already started, skipping.");
      return;
    }

    this.worker = new Worker(
      "outbox-queue",
      async (job) => {
        const requestId = `job_${job.id}`;

        return runWithContext(
          {
            requestId,
            jobId: job.id ?? "unknown",
            queueName: "outbox-queue",
            startTime: performance.now(),
          },
          async () => {
            const container = buildOutboxHandlerContainer();
            const scope = container.createScope();

            const jobId = job.id;
            const outboxAction = job.name as OutboxAction;

            this.logger.info("Processing outbox job", { jobId, outboxAction });

            if (!jobId) throw new BadRequestError("jobId is required");

            try {
              // 1. Schema lookup + validation
              const payloadSchema =
                outboxJobPayloadsSchemas.shape[outboxAction];

              if (!payloadSchema) {
                throw new ValidationError(
                  "outboxAction",
                  `Invalid outbox action: ${outboxAction}`,
                );
              }

              const payload = payloadSchema.parse(
                job.data,
              ) as OutboxJobPayloadType<typeof outboxAction>;

              // 2. Build typed command
              const command = buildOutboxCommand(outboxAction, payload);

              // 3. Resolve service & execute (fully typed end-to-end)
              await executeOutboxHandler(outboxAction, scope, command, jobId);

              this.logger.info("Outbox job completed", { jobId, outboxAction });
            } catch (error) {
              this.logger.error("Outbox job failed", error as Error, {
                jobId,
                outboxAction,
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

    this.logger.info("OutboxHandlerWorker started");
  }

  async stop(): Promise<void> {
    if (!this.worker) return;
    await this.worker.close();
    this.worker = null;
    this.logger.info("OutboxHandlerWorker stopped");
  }
}
