import type { Container } from "#/composition/container.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import {
  seedOutboxJobRow,
  seedOutboxDomainEventRow,
  getOutboxRowById,
} from "#/tests/helpers/outbox-test-helpers.js";
import { OUTBOX_REPOSITORY } from "#/composition/tokens.js";
import type { OutboxRepository } from "#/application/repositories/outbox.repository.js";
import {
  OutboxStatus,
  OutboxAction,
} from "#/application/repositories/outbox.repository.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { OutboxProcessorService } from "./outbox-processor.service.js";
import { OutboxProcessorCommand } from "../commands/outbox-processor.command.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { Queue } from "bullmq";
import type { Mock } from "vitest";

describe("OutboxProcessorService", () => {
  let container: Container;
  let outboxRepository: OutboxRepository;
  let queueMock: { add: Mock };
  let service: OutboxProcessorService;

  beforeAll(() => {
    const testApp = createTestApp();
    container = testApp.container;
    outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
  });

  afterAll(() => {
    cleanupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(container);

    queueMock = { add: vitest.fn() };
    queueMock.add.mockResolvedValue(undefined);

    service = new OutboxProcessorService(
      outboxRepository,
      queueMock as unknown as Queue,
    );
  });

  describe("Success Path", () => {
    // test("when there are no pending jobs, it does nothing", async () => {
    //   await service.execute(new OutboxProcessorCommand(3, 100));

    //   expect(queueMock.add).not.toHaveBeenCalled();
    // });

    test("when a single job succeeds, it marks it PROCESSING then COMPLETED and enqueues it", async () => {
      const jobId = await seedOutboxJobRow(container, {
        eventType: OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
        payload: { orderId: "ord_123" },
      });

      await service.execute(new OutboxProcessorCommand(3, 100));

      expect(queueMock.add).toHaveBeenCalledTimes(1);
      expect(queueMock.add).toHaveBeenCalledWith(
        OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
        { orderId: "ord_123" },
        {
          jobId,
          attempts: 5,
          backoff: { type: "exponential", delay: 2000 },
        },
      );

      const row = await getOutboxRowById(container, jobId);

      expect(row!.status).toBe(OutboxStatus.COMPLETED);
      expect(row!.processed_at).not.toBeNull();
    });

    test("when multiple jobs succeed, it processes and completes all of them", async () => {
      const jobIds = await Promise.all([
        seedOutboxJobRow(container),
        seedOutboxJobRow(container),
        seedOutboxJobRow(container),
      ]);

      await service.execute(new OutboxProcessorCommand(3, 100));

      expect(queueMock.add).toHaveBeenCalledTimes(3);

      for (const id of jobIds) {
        const row = await getOutboxRowById(container, id);
        expect(row!.status).toBe(OutboxStatus.COMPLETED);
        expect(row!.processed_at).not.toBeNull();
      }
    });

    test("it respects batchSize and leaves the remaining jobs untouched", async () => {
      const now = Date.now();
      const oldest = await seedOutboxJobRow(container, {
        scheduledAt: new Date(now - 30_000),
      });
      const middle = await seedOutboxJobRow(container, {
        scheduledAt: new Date(now - 20_000),
      });
      const newest = await seedOutboxJobRow(container, {
        scheduledAt: new Date(now - 10_000),
      });

      await service.execute(new OutboxProcessorCommand(3, 2)); // batchSize = 2

      expect(queueMock.add).toHaveBeenCalledTimes(2);

      const oldestRow = await getOutboxRowById(container, oldest);
      const middleRow = await getOutboxRowById(container, middle);
      const newestRow = await getOutboxRowById(container, newest);

      expect(oldestRow!.status).toBe(OutboxStatus.COMPLETED);
      expect(middleRow!.status).toBe(OutboxStatus.COMPLETED);
      // the most-recently-scheduled row is left for the next iteration
      expect(newestRow!.status).toBe(OutboxStatus.PENDING);
      expect(newestRow!.attempts).toBe(0);
    });

    test("it does not pick up jobs scheduled in the future", async () => {
      const futureJobId = await seedOutboxJobRow(container, {
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      });

      await service.execute(new OutboxProcessorCommand(3, 100));

      expect(queueMock.add).not.toHaveBeenCalled();

      const row = await getOutboxRowById(container, futureJobId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.attempts).toBe(0);
    });

    test("it does not pick up jobs that are not PENDING", async () => {
      const processingId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
      });
      const completedId = await seedOutboxJobRow(container, {
        status: OutboxStatus.COMPLETED,
        processedAt: new Date(),
      });
      const failedId = await seedOutboxJobRow(container, {
        status: OutboxStatus.FAILED,
        processedAt: new Date(),
      });

      await service.execute(new OutboxProcessorCommand(3, 100));

      expect(queueMock.add).not.toHaveBeenCalled();

      for (const id of [processingId, completedId, failedId]) {
        const row = await getOutboxRowById(container, id);
        expect(row!.attempts).toBe(0);
      }
    });

    test("it only processes OUTBOX_JOB rows and never touches DOMAIN_EVENT rows", async () => {
      const jobId = await seedOutboxJobRow(container);
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
      );

      await service.execute(new OutboxProcessorCommand(3, 100));

      expect(queueMock.add).toHaveBeenCalledTimes(1);

      const jobRow = await getOutboxRowById(container, jobId);
      expect(jobRow!.status).toBe(OutboxStatus.COMPLETED);

      const eventRow = await getOutboxRowById(container, eventId);
      expect(eventRow!.status).toBe(OutboxStatus.PENDING);
      expect(eventRow!.attempts).toBe(0);
      expect(eventRow!.processed_at).toBeNull();
    });

    test("on success, it modifys the attempts counter", async () => {
      // simulates a job that already failed twice before finally succeeding
      const jobId = await seedOutboxJobRow(container, { attempts: 2 });

      await service.execute(new OutboxProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, jobId);
      expect(row!.status).toBe(OutboxStatus.COMPLETED);
      expect(row!.attempts).toBe(3); // 2 + 1
    });
  });

  describe("Failure & Retry", () => {
    test("when queue.add throws and attempts remain, it reschedules with exponential backoff", async () => {
      const jobId = await seedOutboxJobRow(container, { attempts: 0 });
      queueMock.add.mockRejectedValueOnce(new Error("queue unavailable"));

      const beforeExecute = Date.now();
      await service.execute(new OutboxProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, jobId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.attempts).toBe(1);
      expect(row!.error_message).toBe("queue unavailable");
      expect(row!.processed_at).toBeNull();

      // nextAttempts = 1 -> retryDelayMs = 2^1 * 1000 = 2000ms
      const scheduledDelay = row!.scheduledAt.getTime() - beforeExecute;
      expect(scheduledDelay).toBeGreaterThan(1500);
      expect(scheduledDelay).toBeLessThan(3000);
    });

    test("retry delay grows exponentially with the attempts count", async () => {
      const jobId = await seedOutboxJobRow(container, { attempts: 2 }); // -> nextAttempts = 3
      queueMock.add.mockRejectedValueOnce(new Error("still down"));

      const beforeExecute = Date.now();
      await service.execute(new OutboxProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, jobId);
      expect(row!.attempts).toBe(3);

      // retryDelayMs = 2^3 * 1000 = 8000ms
      const scheduledDelay = row!.scheduledAt.getTime() - beforeExecute;
      expect(scheduledDelay).toBeGreaterThan(7000);
      expect(scheduledDelay).toBeLessThan(9500);
    });

    test("when nextAttempts reaches maxPublicationAttempts, it marks the job FAILED instead of retrying", async () => {
      const jobId = await seedOutboxJobRow(container, { attempts: 2 });
      queueMock.add.mockRejectedValueOnce(new Error("permanently broken"));

      await service.execute(new OutboxProcessorCommand(3, 100)); // max = 3, nextAttempts = 3

      const row = await getOutboxRowById(container, jobId);
      expect(row!.status).toBe(OutboxStatus.FAILED);
      expect(row!.attempts).toBe(3);
      expect(row!.error_message).toBe("permanently broken");
      expect(row!.processed_at).not.toBeNull();
    });

    test("with maxPublicationAttempts = 1, a single failure immediately marks the job FAILED", async () => {
      const jobId = await seedOutboxJobRow(container, { attempts: 0 });
      queueMock.add.mockRejectedValueOnce(new Error("down"));

      await service.execute(new OutboxProcessorCommand(1, 100));

      const row = await getOutboxRowById(container, jobId);
      expect(row!.status).toBe(OutboxStatus.FAILED);
      expect(row!.attempts).toBe(1);
    });

    test("a failure in one job does not stop the rest of the batch from being processed", async () => {
      const now = Date.now();
      const failingJobId = await seedOutboxJobRow(container, {
        scheduledAt: new Date(now - 2000),
      });
      const succeedingJobId = await seedOutboxJobRow(container, {
        scheduledAt: new Date(now - 1000),
      });

      queueMock.add
        .mockRejectedValueOnce(new Error("first job failed"))
        .mockResolvedValueOnce(undefined);

      await service.execute(new OutboxProcessorCommand(5, 100));

      expect(queueMock.add).toHaveBeenCalledTimes(2);

      const failingRow = await getOutboxRowById(container, failingJobId);
      expect(failingRow!.status).toBe(OutboxStatus.PENDING);
      expect(failingRow!.attempts).toBe(1);

      const succeedingRow = await getOutboxRowById(container, succeedingJobId);
      expect(succeedingRow!.status).toBe(OutboxStatus.COMPLETED);
    });

    test("a non-Error thrown value is still handled gracefully with a fallback error message", async () => {
      const jobId = await seedOutboxJobRow(container, { attempts: 0 });
      queueMock.add.mockRejectedValueOnce("a plain string rejection");

      await service.execute(new OutboxProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, jobId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.error_message).toBe("Unknown error");
    });
  });

  describe("Resilience to DB failures mid-iteration", () => {
    test("when marking a job as PROCESSING fails, the failure is caught and the job is scheduled for retry (queue is never called)", async () => {
      const jobId = await seedOutboxJobRow(container, { attempts: 0 });

      const updateRowSpy = vitest
        .spyOn(outboxRepository, "updateRow")
        .mockImplementationOnce(async () => {
          throw new Error("DB write failed while marking PROCESSING");
        });
      // subsequent calls to updateRow fall through to the real implementation

      await service.execute(new OutboxProcessorCommand(5, 100));

      expect(queueMock.add).not.toHaveBeenCalled();

      const row = await getOutboxRowById(container, jobId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.attempts).toBe(1);
      expect(row!.error_message).toBe(
        "DB write failed while marking PROCESSING",
      );

      updateRowSpy.mockRestore();
    });
  });

  describe("OutboxProcessorCommand validation (no DB needed)", () => {
    test("throws ValidationError when batchSize is 0 or negative", () => {
      expect(() => new OutboxProcessorCommand(3, 0)).toThrow(ValidationError);
      expect(() => new OutboxProcessorCommand(3, -5)).toThrow(ValidationError);
    });

    test("throws ValidationError when maxPublicationAttempts is 0 or negative", () => {
      expect(() => new OutboxProcessorCommand(0, 100)).toThrow(ValidationError);
      expect(() => new OutboxProcessorCommand(-1, 100)).toThrow(
        ValidationError,
      );
    });

    test("defaults maxPublicationAttempts to 3 when omitted", () => {
      const command = new OutboxProcessorCommand(undefined, 100);
      expect(command.maxPublicationAttempts).toBe(3);
    });
  });
});
