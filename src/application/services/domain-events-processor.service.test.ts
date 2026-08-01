// src/application/services/domain-events-processor.service.test.ts
import { buildUnitTestsContainer } from "#/composition/tests/unit-test-composition.js";
import {
  OUTBOX_REPOSITORY,
  EVENT_PUBLISHER,
  DOMAIN_EVENTS_PROCESSOR_SERVICE,
} from "#/composition/tokens.js";
import type { InMemoryOutboxRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-outbox-repository.js";
import { FakeEventPublisher } from "#/tests/helpers/fake-event-publisher.js";
import { OutboxProcessorCommand } from "../commands/outbox-processor.command.js";
import { OutboxStatus } from "../repositories/outbox.repository.js";
import type { DomainEventCode } from "#/domain/events/domain-event.js";

// Minimal fake domain event for seeding the outbox
function fakeDomainEvent(eventType: DomainEventCode, aggregateId: string): any {
  return {
    eventType,
    aggregateId,
    occurredAt: new Date(),
  };
}

describe("DomainEventsProcessorService", () => {
  function setup() {
    const container = buildUnitTestsContainer();
    const scope = container.createScope();
    const service = scope.resolve(DOMAIN_EVENTS_PROCESSOR_SERVICE);
    const repo = scope.resolve(OUTBOX_REPOSITORY) as InMemoryOutboxRepository;
    const publisher = scope.resolve(EVENT_PUBLISHER) as FakeEventPublisher;

    return { container, scope, service, repo, publisher };
  }

  test("when no pending events exist, it does nothing ", async () => {
    const { service, repo, publisher } = setup();

    await service.execute(new OutboxProcessorCommand(5));

    expect(repo.getAllEntries()).toHaveLength(0);
    expect(publisher.published).toHaveLength(0);
  });

  test("when a pending event exists in DB, it marks it as PROCESSING, adds it to queue, marks it as COMPLETED", async () => {
    const { service, repo, publisher } = setup();

    await repo.saveEvents([fakeDomainEvent("order.created", "ord_123")]);

    await service.execute(new OutboxProcessorCommand(5));

    const entries = repo.getAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe(OutboxStatus.COMPLETED);
    expect(entries[0]!.processedAt).toBeInstanceOf(Date);
    expect(entries[0]!.attempts).toBe(0);

    expect(publisher.published).toHaveLength(1);
    expect(publisher.published[0]!.eventType).toBe("order.created");
    expect(publisher.published[0]!.payload).toMatchObject({
      aggregateId: "ord_123",
    });
    expect(publisher.published[0]!.jobId).toBe(entries[0]!.id);
  });

  test("when an event publishing fails, it marks job as pending with exponential backoff and increments attempts", async () => {
    const { service, repo, publisher } = setup();
    publisher.shouldFail = true;

    await repo.saveEvents([fakeDomainEvent("order.cancelled", "ord_456")]);

    const before = Date.now();
    await service.execute(new OutboxProcessorCommand(5));
    const after = Date.now();

    const entry = repo.getAllEntries()[0]!;
    expect(entry.status).toBe(OutboxStatus.PENDING);
    expect(entry.attempts).toBe(1);
    expect(entry.errorMessage).toBe("EventPublisher.publish() failed");
    expect(entry.scheduledAt.getTime()).toBeGreaterThanOrEqual(before + 2000); // 2^1 * 1000
    expect(entry.scheduledAt.getTime()).toBeLessThanOrEqual(after + 3000);
  });

  test("when max attempts is reached, it marks job as FAILED", async () => {
    const { service, repo, publisher } = setup();
    publisher.shouldFail = true;

    await repo.saveEvents([fakeDomainEvent("order.confirmed", "ord_789")]);

    // Simulate 4 previous failed attempts (next will be 5, which equals max)
    const entries = repo.getAllEntries();
    entries[0]!.attempts = 4;

    await service.execute(new OutboxProcessorCommand(5));

    const entry = repo.getAllEntries()[0]!;
    expect(entry.status).toBe(OutboxStatus.FAILED);
    expect(entry.attempts).toBe(5);
    expect(entry.processedAt).toBeInstanceOf(Date);
    expect(entry.errorMessage).toBe("EventPublisher.publish() failed");
  });

  test("when multiple jobs processed at the same time and one fails, it doesn't affect the processing of other jobs", async () => {
    const { service, repo, publisher } = setup();

    await repo.saveEvents([
      fakeDomainEvent("order.created", "ord_1"),
      fakeDomainEvent("order.cancelled", "ord_2"),
    ]);

    // Fail only the first publish call
    let callCount = 0;
    publisher.publish = async (eventType, payload, jobId) => {
      callCount++;
      if (callCount === 1) throw new Error("First publish fails");
      publisher.published.push({ eventType, payload, jobId });
    };

    await service.execute(new OutboxProcessorCommand(5));

    const entries = repo.getAllEntries();
    expect(entries[0]!.status).toBe(OutboxStatus.PENDING); // first event retried
    expect(entries[0]!.attempts).toBe(1);
    expect(entries[1]!.status).toBe(OutboxStatus.COMPLETED); // second event succeeded

    expect(publisher.published).toHaveLength(1); // only second event published
  });

  test("when a job retries for a 2nd time and fails, it uses a 4 second backoff for the next attempt", async () => {
    const { service, repo, publisher } = setup();
    publisher.shouldFail = true;

    await repo.saveEvents([fakeDomainEvent("order.created", "ord_123")]);

    // Already failed once
    repo.getAllEntries()[0]!.attempts = 1;

    const before = Date.now();
    await service.execute(new OutboxProcessorCommand(5));
    const after = Date.now();

    const entry = repo.getAllEntries()[0]!;
    expect(entry.attempts).toBe(2);
    expect(entry.scheduledAt.getTime()).toBeGreaterThanOrEqual(before + 4000); // 2^2 * 1000
    expect(entry.scheduledAt.getTime()).toBeLessThanOrEqual(after + 5000);
  });
});
