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
import type { EventPublisher } from "../ports/event-publisher.port.js";
import { DomainEventsProcessorCommand } from "../commands/domain-events-processor.command.js";
import { OrderCreated } from "#/domain/events/order/order-created.js";
import { ShippingProvider } from "#/domain/entities/order.js";

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

    test("when a single event succeeds, it marks it PROCESSING then COMPLETED and enqueues it", async () => {
      const event = new OrderCreated(
        "ord_123",
        "usr_123",
        4,
        4000,
        "DZD",
        ShippingProvider.WORLD_EXPRESS,
      );

      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          aggregateId: "ord_123",
          payload: { ...event, occurredOn: event.occurredOn.toISOString() },
        },
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(1);
      expect(eventPublisherMock.publish).toHaveBeenCalledWith(
        DomainEventCode.ORDER_CREATED,
        { ...event, occurredOn: event.occurredOn.toISOString() },
        eventId,
      );

      const row = await getOutboxRowById(container, eventId);

      expect(row!.status).toBe(OutboxStatus.COMPLETED);
      expect(row!.processed_at).not.toBeNull();
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
        {
          scheduledAt: new Date(now - 30_000),
        },
      );
      const middle = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          scheduledAt: new Date(now - 20_000),
        },
      );
      const newest = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          scheduledAt: new Date(now - 10_000),
        },
      );

      await service.execute(new DomainEventsProcessorCommand(3, 2)); // batchSize = 2

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(2);

      const oldestRow = await getOutboxRowById(container, oldest);
      const middleRow = await getOutboxRowById(container, middle);
      const newestRow = await getOutboxRowById(container, newest);

      expect(oldestRow!.status).toBe(OutboxStatus.COMPLETED);
      expect(middleRow!.status).toBe(OutboxStatus.COMPLETED);
      // the most-recently-scheduled row is left for the next iteration
      expect(newestRow!.status).toBe(OutboxStatus.PENDING);
      expect(newestRow!.attempts).toBe(0);
    });

    test("it does not pick up events scheduled in the future", async () => {
      const futureeventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        },
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).not.toHaveBeenCalled();

      const row = await getOutboxRowById(container, futureeventId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.attempts).toBe(0);
    });

    test("it does not pick up events that are not PENDING", async () => {
      const processingId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          status: OutboxStatus.PROCESSING,
        },
      );
      const completedId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          status: OutboxStatus.COMPLETED,
          processedAt: new Date(),
        },
      );
      const failedId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          status: OutboxStatus.FAILED,
          processedAt: new Date(),
        },
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).not.toHaveBeenCalled();

      for (const id of [processingId, completedId, failedId]) {
        const row = await getOutboxRowById(container, id);
        expect(row!.attempts).toBe(0);
      }
    });

    test("it only processes DOMAIN_EVENT rows and never touches OUTBOX_JOB rows", async () => {
      const jobId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PENDING,
      });

      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(1);

      const eventRow = await getOutboxRowById(container, eventId);
      expect(eventRow!.status).toBe(OutboxStatus.COMPLETED);

      const jobRow = await getOutboxRowById(container, jobId);
      expect(jobRow!.status).toBe(OutboxStatus.PENDING);
      expect(jobRow!.attempts).toBe(0);
      expect(jobRow!.processed_at).toBeNull();
    });

    test("on success, it modifys the attempts counter", async () => {
      // simulates a job that already failed twice before finally succeeding
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          attempts: 2,
        },
      );

      await service.execute(new DomainEventsProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.COMPLETED);
      expect(row!.attempts).toBe(3); // 2 + 1
    });
  });

  describe("Failure & Retry", () => {
    test("when queue.add throws and attempts remain, it reschedules with exponential backoff", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          attempts: 0,
        },
      );
      eventPublisherMock.publish.mockRejectedValueOnce(
        new Error("queue unavailable"),
      );

      const beforeExecute = Date.now();
      await service.execute(new DomainEventsProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, eventId);
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
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          attempts: 2,
        },
      ); // -> nextAttempts = 3
      eventPublisherMock.publish.mockRejectedValueOnce(new Error("still down"));

      const beforeExecute = Date.now();
      await service.execute(new DomainEventsProcessorCommand(5, 100));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.attempts).toBe(3);

      // retryDelayMs = 2^3 * 1000 = 8000ms
      const scheduledDelay = row!.scheduledAt.getTime() - beforeExecute;
      expect(scheduledDelay).toBeGreaterThan(7000);
      expect(scheduledDelay).toBeLessThan(9500);
    });

    test("when nextAttempts reaches maxPublicationAttempts, it marks the event FAILED instead of retrying", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          attempts: 2,
        },
      );
      eventPublisherMock.publish.mockRejectedValueOnce(
        new Error("permanently broken"),
      );

      await service.execute(new DomainEventsProcessorCommand(3, 100)); // max = 3, nextAttempts = 3

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
        {
          attempts: 0,
        },
      );
      eventPublisherMock.publish.mockRejectedValueOnce(new Error("down"));

      await service.execute(new DomainEventsProcessorCommand(1, 100));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.FAILED);
      expect(row!.attempts).toBe(1);
    });

    test("a failure in one event does not stop the rest of the batch from being processed", async () => {
      const now = Date.now();
      const failingeventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          scheduledAt: new Date(now - 2000),
        },
      );
      const succeedingeventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          scheduledAt: new Date(now - 1000),
        },
      );

      eventPublisherMock.publish
        .mockRejectedValueOnce(new Error("first job failed"))
        .mockResolvedValueOnce(undefined);

      await service.execute(new DomainEventsProcessorCommand(5, 100));

      expect(eventPublisherMock.publish).toHaveBeenCalledTimes(2);

      const failingRow = await getOutboxRowById(container, failingeventId);
      expect(failingRow!.status).toBe(OutboxStatus.PENDING);
      expect(failingRow!.attempts).toBe(1);

      const succeedingRow = await getOutboxRowById(
        container,
        succeedingeventId,
      );
      expect(succeedingRow!.status).toBe(OutboxStatus.COMPLETED);
    });

    test("a non-Error thrown value is still handled gracefully with a fallback error message", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          attempts: 0,
        },
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
    test("when marking an event as PROCESSING fails, the failure is caught and the event is scheduled for retry (queue is never called)", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          attempts: 0,
        },
      );

      const updateRowSpy = vitest
        .spyOn(outboxRepository, "updateRow")
        .mockImplementationOnce(async () => {
          throw new Error("DB write failed while marking PROCESSING");
        });
      // subsequent calls to updateRow fall through to the real implementation

      await service.execute(new DomainEventsProcessorCommand(5, 100));

      expect(eventPublisherMock.publish).not.toHaveBeenCalled();

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.attempts).toBe(1);
      expect(row!.error_message).toBe(
        "DB write failed while marking PROCESSING",
      );

      updateRowSpy.mockRestore();
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
