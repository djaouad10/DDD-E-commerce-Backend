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
import { OutboxStatus } from "#/application/repositories/outbox.repository.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { Mock } from "vitest";
import { DomainEventsProcessorService } from "./domain-events-processor.service.js";
import type { EventPublisher } from "#/application/ports/event-publisher.port.js";
import { DomainEventsProcessorCommand } from "#/application/commands/domain-events-processor/domain-events-processor.command.js";

describe("DomainEventsProcessorService", () => {
  let container: Container;
  let outboxRepository: OutboxRepository;
  let eventPublisherMock: { publish: Mock };
  let service: DomainEventsProcessorService;

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

    eventPublisherMock = { publish: vitest.fn() };
    eventPublisherMock.publish.mockResolvedValue(undefined);

    service = new DomainEventsProcessorService(
      outboxRepository,
      eventPublisherMock as unknown as EventPublisher,
    );
  });

  describe("Success Path", () => {
    test("when there are no pending events, it does nothing", async () => {
      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).not.toHaveBeenCalled();
    });

    test("when a single event succeeds, it claims it, publishes it, and marks it COMPLETED", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          aggregateId: "ord_123",
          payload: { orderId: "ord_123" },
        },
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(1);
      expect(eventPublisherMock.publish).toHaveBeenCalledWith(
        DomainEventCode.ORDER_CREATED,
        { orderId: "ord_123" },
        eventId,
      );

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.COMPLETED);
      expect(row!.processed_at).not.toBeNull();
      expect(row!.attempts).toBe(1); // incremented at claim time (job.attempts=0 -> 1)
    });

    test("when multiple events succeed, it processes and completes all of them", async () => {
      const eventIds = await Promise.all([
        seedOutboxDomainEventRow(container, DomainEventCode.ORDER_CREATED),
        seedOutboxDomainEventRow(container, DomainEventCode.ORDER_CREATED),
        seedOutboxDomainEventRow(container, DomainEventCode.ORDER_CREATED),
      ]);

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(3);

      for (const id of eventIds) {
        const row = await getOutboxRowById(container, id);
        expect(row!.status).toBe(OutboxStatus.COMPLETED);
        expect(row!.processed_at).not.toBeNull();
      }
    });

    test("it respects batchSize and leaves the remaining events untouched", async () => {
      const now = Date.now();
      const oldest = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { scheduledAt: new Date(now - 30_000) },
      );
      const middle = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { scheduledAt: new Date(now - 20_000) },
      );
      const newest = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { scheduledAt: new Date(now - 10_000) },
      );

      await service.execute(new DomainEventsProcessorCommand(3, 2)); // batchSize = 2

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(2);

      const oldestRow = await getOutboxRowById(container, oldest);
      const middleRow = await getOutboxRowById(container, middle);
      const newestRow = await getOutboxRowById(container, newest);

      expect(oldestRow!.status).toBe(OutboxStatus.COMPLETED);
      expect(middleRow!.status).toBe(OutboxStatus.COMPLETED);
      // the most-recently-scheduled row is left for the next iteration, untouched
      expect(newestRow!.status).toBe(OutboxStatus.PENDING);
      expect(newestRow!.attempts).toBe(0);
    });

    test("it does not pick up events scheduled in the future", async () => {
      const futureEventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { scheduledAt: new Date(Date.now() + 60 * 60 * 1000) },
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).not.toHaveBeenCalled();

      const row = await getOutboxRowById(container, futureEventId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.attempts).toBe(0);
    });

    test("it does not pick up events that are not PENDING", async () => {
      const processingId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { status: OutboxStatus.PROCESSING },
      );
      const completedId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { status: OutboxStatus.COMPLETED, processedAt: new Date() },
      );
      const failedId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { status: OutboxStatus.FAILED, processedAt: new Date() },
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).not.toHaveBeenCalled();

      for (const id of [processingId, completedId, failedId]) {
        const row = await getOutboxRowById(container, id);
        expect(row!.attempts).toBe(0);
      }
    });

    test("it only processes DOMAIN_EVENT rows and never touches OUTBOX_JOB rows", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
      );
      const jobId = await seedOutboxJobRow(container);

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(1);

      const eventRow = await getOutboxRowById(container, eventId);
      expect(eventRow!.status).toBe(OutboxStatus.COMPLETED);

      const jobRow = await getOutboxRowById(container, jobId);
      expect(jobRow!.status).toBe(OutboxStatus.PENDING);
      expect(jobRow!.attempts).toBe(0);
      expect(jobRow!.processed_at).toBeNull();
    });

    test("on success, the attempts counter reflects the claim increment", async () => {
      // simulates an event that already failed twice before finally succeeding
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 2 },
      );

      await service.execute(new DomainEventsProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.COMPLETED);
      expect(row!.attempts).toBe(3); // 2 + 1, set at claim time
    });
  });

  describe("Concurrent claiming", () => {
    test("when updateRowToProcessing fails to claim (row no longer PENDING), the event is skipped and the publisher is never called", async () => {
      // seed a PENDING event...
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 0 },
      );

      // ...then simulate another worker instance having already claimed it a
      // moment earlier (real DB call, so the row is genuinely PROCESSING now)
      const claimedByOtherWorker = await outboxRepository.updateRowToProcessing(
        { id: eventId, attempts: 1 },
      );
      expect(claimedByOtherWorker).toBe(true);

      // and simulate THIS worker's getPendingEvents having already read the
      // stale PENDING snapshot before the other worker's claim landed (the
      // actual race)
      const getPendingEventsSpy = vitest
        .spyOn(outboxRepository, "getPendingEvents")
        .mockResolvedValueOnce([
          {
            id: eventId,
            category: "domain-event",
            eventType: DomainEventCode.ORDER_CREATED,
            aggregateId: null,
            payload: {},
            status: OutboxStatus.PENDING,
            attempts: 0,
            scheduledAt: new Date(),
            processedAt: null,
            errorMessage: null,
            createdAt: new Date(),
            lockedAt: null,
          },
        ]);

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      // this worker's own claim attempt must fail (row is no longer PENDING),
      // so it must never publish a duplicate event
      expect(eventPublisherMock.publish).not.toHaveBeenCalled();

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.PROCESSING);
      expect(row!.attempts).toBe(1); // left exactly as the "other worker" claimed it

      getPendingEventsSpy.mockRestore();
    });

    test("a failed claim on one event does not stop the rest of the batch from being processed", async () => {
      const now = Date.now();
      const alreadyClaimedId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { scheduledAt: new Date(now - 2000) },
      );
      const freeEventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { scheduledAt: new Date(now - 1000) },
      );

      await outboxRepository.updateRowToProcessing({
        id: alreadyClaimedId,
        attempts: 1,
      });

      const getPendingEventsSpy = vitest
        .spyOn(outboxRepository, "getPendingEvents")
        .mockResolvedValueOnce([
          {
            id: alreadyClaimedId,
            category: "domain-event",
            eventType: DomainEventCode.ORDER_CREATED,
            aggregateId: null,
            payload: {},
            status: OutboxStatus.PENDING,
            attempts: 0,
            scheduledAt: new Date(now - 2000),
            processedAt: null,
            errorMessage: null,
            createdAt: new Date(),
            lockedAt: null,
          },
          {
            id: freeEventId,
            category: "domain-event",
            eventType: DomainEventCode.ORDER_CREATED,
            aggregateId: null,
            payload: {},
            status: OutboxStatus.PENDING,
            attempts: 0,
            scheduledAt: new Date(now - 1000),
            processedAt: null,
            errorMessage: null,
            createdAt: new Date(),
            lockedAt: null,
          },
        ]);

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(1);
      expect(eventPublisherMock.publish).toHaveBeenCalledWith(
        DomainEventCode.ORDER_CREATED,
        {},
        freeEventId,
      );

      const freeRow = await getOutboxRowById(container, freeEventId);
      expect(freeRow!.status).toBe(OutboxStatus.COMPLETED);

      getPendingEventsSpy.mockRestore();
    });
  });

  describe("Failure & Retry", () => {
    test("when publish throws and attempts remain, it reschedules with exponential backoff", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 0 },
      );
      eventPublisherMock.publish.mockRejectedValueOnce(
        new Error("queue unavailable"),
      );

      const beforeExecute = Date.now();
      await service.execute(new DomainEventsProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.attempts).toBe(1); // set at claim time
      expect(row!.error_message).toBe("queue unavailable");
      expect(row!.processed_at).toBeNull();

      // attempt = 1 -> retryDelayMs = 2^1 * 1000 = 2000ms
      const scheduledDelay = row!.scheduledAt.getTime() - beforeExecute;
      expect(scheduledDelay).toBeGreaterThan(1500);
      expect(scheduledDelay).toBeLessThan(3000);
    });

    test("retry delay grows exponentially with the attempts count", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 2 }, // -> attempt = 3
      );
      eventPublisherMock.publish.mockRejectedValueOnce(new Error("still down"));

      const beforeExecute = Date.now();
      await service.execute(new DomainEventsProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.attempts).toBe(3);

      // attempt = 3 -> retryDelayMs = 2^3 * 1000 = 8000ms
      const scheduledDelay = row!.scheduledAt.getTime() - beforeExecute;
      expect(scheduledDelay).toBeGreaterThan(7000);
      expect(scheduledDelay).toBeLessThan(9500);
    });

    test("when attempt reaches maxPublicationAttempts, it marks the event FAILED instead of retrying", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 2 },
      );
      eventPublisherMock.publish.mockRejectedValueOnce(
        new Error("permanently broken"),
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100)); // max = 3, attempt = 3

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.FAILED);
      expect(row!.attempts).toBe(3);
      expect(row!.error_message).toBe("permanently broken");
      expect(row!.processed_at).not.toBeNull();
    });

    test("with maxPublicationAttempts = 1, a single failure immediately marks the event FAILED", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 0 },
      );
      eventPublisherMock.publish.mockRejectedValueOnce(new Error("down"));

      await service.execute(new DomainEventsProcessorCommand(1, 100));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.FAILED);
      expect(row!.attempts).toBe(1);
    });

    test("a publish failure in one event does not stop the rest of the batch from being processed", async () => {
      const now = Date.now();
      const failingEventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { scheduledAt: new Date(now - 2000) },
      );
      const succeedingEventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { scheduledAt: new Date(now - 1000) },
      );

      eventPublisherMock.publish
        .mockRejectedValueOnce(new Error("first job failed"))
        .mockResolvedValueOnce(undefined);

      await service.execute(new DomainEventsProcessorCommand(5, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(2);

      const failingRow = await getOutboxRowById(container, failingEventId);
      expect(failingRow!.status).toBe(OutboxStatus.PENDING);
      expect(failingRow!.attempts).toBe(1);

      const succeedingRow = await getOutboxRowById(
        container,
        succeedingEventId,
      );
      expect(succeedingRow!.status).toBe(OutboxStatus.COMPLETED);
    });

    test("a non-Error thrown value is still handled gracefully with a fallback error message", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 0 },
      );
      eventPublisherMock.publish.mockRejectedValueOnce(
        "a plain string rejection",
      );

      await service.execute(new DomainEventsProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.error_message).toBe("Unknown error");
    });
  });

  describe("Resilience to DB failures mid-iteration", () => {
    test("when claiming an event (updateRowToProcessing) throws, the error is caught locally and does not abort the batch", async () => {
      const eventId1 = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 0 },
      );
      const eventId2 = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 0 },
      );

      const claimSpy = vitest
        .spyOn(outboxRepository, "updateRowToProcessing")
        .mockRejectedValueOnce(new Error("DB write failed while claiming"));

      await service.execute(new DomainEventsProcessorCommand(5, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(1);

      const row1 = await getOutboxRowById(container, eventId1);
      const row2 = await getOutboxRowById(container, eventId2);

      expect(row1!.status).toBe(OutboxStatus.PENDING); // untouched, claim never landed
      expect(row1!.attempts).toBe(0);

      expect(row2!.status).toBe(OutboxStatus.COMPLETED);
      expect(row2!.attempts).toBe(1);

      claimSpy.mockRestore();
    });

    test("when the publish succeeds but marking the row COMPLETED fails, it logs and leaves the row PROCESSING rather than throwing", async () => {
      // This is the "stuck row" scenario the service's comments call out: the
      // event really was published (at-least-once delivery already happened),
      // so the service must NOT throw or retry-publish — it should let the row
      // sit as PROCESSING for the stuck-row recovery worker to pick up later.
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        { attempts: 0 },
      );

      const completeSpy = vitest
        .spyOn(outboxRepository, "updateRowToCompleted")
        .mockRejectedValueOnce(new Error("DB write failed after publish"));

      await expect(
        service.execute(new DomainEventsProcessorCommand(5, 100)),
      ).resolves.toBeUndefined();

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(1);

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.PROCESSING); // left stuck, by design
      expect(row!.attempts).toBe(1); // already committed at claim time
      expect(row!.processed_at).toBeNull();

      completeSpy.mockRestore();
    });

    test("when handling a publish failure (updateRowToPending) itself throws, the error is caught locally and does not abort the batch", async () => {
      const now = Date.now();
      const failedEventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          scheduledAt: new Date(now - 2000),
        },
      );
      const succeededEventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          scheduledAt: new Date(now - 1000),
        },
      );

      eventPublisherMock.publish
        .mockRejectedValueOnce(new Error("queue down"))
        .mockResolvedValueOnce(undefined);

      const pendingSpy = vitest
        .spyOn(outboxRepository, "updateRowToPending")
        .mockRejectedValueOnce(
          new Error("DB write failed while retry-scheduling"),
        );

      await service.execute(new DomainEventsProcessorCommand(5, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(2);

      const failedRow = await getOutboxRowById(container, failedEventId);
      const succeededRow = await getOutboxRowById(container, succeededEventId);
      expect(failedRow!.status).toBe(OutboxStatus.PROCESSING);
      expect(succeededRow!.status).toBe(OutboxStatus.COMPLETED);

      pendingSpy.mockRestore();
    });
  });

  describe("DomainEventsProcessorCommand validation (no DB needed)", () => {
    test("throws ValidationError when batchSize is 0 or negative", () => {
      expect(() => new DomainEventsProcessorCommand(3, 0)).toThrow(
        ValidationError,
      );
      expect(() => new DomainEventsProcessorCommand(3, -5)).toThrow(
        ValidationError,
      );
    });

    test("throws ValidationError when maxPublicationAttempts is 0 or negative", () => {
      expect(() => new DomainEventsProcessorCommand(0, 100)).toThrow(
        ValidationError,
      );
      expect(() => new DomainEventsProcessorCommand(-1, 100)).toThrow(
        ValidationError,
      );
    });

    test("defaults maxPublicationAttempts to 3 when omitted", () => {
      const command = new DomainEventsProcessorCommand(undefined, 100);
      expect(command.maxPublicationAttempts).toBe(3);
    });
  });
});
