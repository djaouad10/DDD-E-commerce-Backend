import { buildUnitTestsContainer } from "#/composition/tests/unit-test-composition.js";
import {
  OUTBOX_PROCESSOR_SERVICE,
  OUTBOX_QUEUE,
  OUTBOX_REPOSITORY,
} from "#/composition/tokens.js";
import type { InMemoryOutboxRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-outbox-repository.js";
import type { FakeQueue } from "#/tests/helpers/fake-queue.js";
import { OutboxProcessorCommand } from "../commands/outbox-processor.command.js";
import {
  OutboxAction,
  OutboxStatus,
} from "../repositories/outbox.repository.js";

describe("OutboxProcessorService", () => {
  function setup() {
    const container = buildUnitTestsContainer();
    const scope = container.createScope();

    const service = scope.resolve(OUTBOX_PROCESSOR_SERVICE);
    const repo = scope.resolve(OUTBOX_REPOSITORY) as InMemoryOutboxRepository; // so I can use methods like getAllEntries()
    const outboxQueue = scope.resolve(OUTBOX_QUEUE) as unknown as FakeQueue; // so I can use methods like addedJobs

    return {
      container,
      scope,
      service,
      repo: repo,
      queue: outboxQueue,
    };
  }

  test("when no pending jobs in DB, it does nothing", async () => {
    // arrange
    const { service, repo, queue } = setup();

    // act
    await service.execute(new OutboxProcessorCommand(5));

    // assert
    expect(repo.getAllEntries()).toHaveLength(0);
    expect(queue.addedJobs).toHaveLength(0);
  });

  test("when a pending job exists in DB, it marks it as PROCESSING, adds it to queue, marks it as COMPLETED", async () => {
    // arrange
    const { service, repo, queue } = setup();

    repo.saveJob({
      action: OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      scheduledAt: new Date(),
      payload: { orderId: "ord_123" },
    });

    // act
    await service.execute(new OutboxProcessorCommand(5));

    // assert
    const entries = repo.getAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe(OutboxStatus.COMPLETED);
    expect(entries[0]!.processedAt).toBeInstanceOf(Date);
    expect(entries[0]!.attempts).toBe(0);

    expect(queue.addedJobs).toHaveLength(1);
    expect(queue.addedJobs[0]!.name).toBe(
      OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
    );
    expect(queue.addedJobs[0]!.data).toEqual({ orderId: "ord_123" });
    expect(queue.addedJobs[0]!.opts).toMatchObject({
      jobId: entries[0]!.id,
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    });
  });

  test("when a queue publishing fails, it marks job as pending with exponential backoff and increments attempts", async () => {
    // Arrange
    const { service, repo, queue } = setup();

    queue.shouldFail = true; // simulate queue failure

    repo.saveJob({
      action: OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      payload: { orderId: "ord_123" },
    });

    // Act
    const before = Date.now();
    await service.execute(new OutboxProcessorCommand(3));
    const after = Date.now();

    // Assert
    const entry = repo.getAllEntries()[0]!;
    expect(entry.status).toBe(OutboxStatus.PENDING);
    expect(entry.attempts).toBe(1);
    expect(entry.errorMessage).toBe("Queue.add() failed");
    expect(entry.scheduledAt.getTime()).toBeGreaterThanOrEqual(before + 2000); // 2^1 * 1000
    expect(entry.scheduledAt.getTime()).toBeLessThanOrEqual(after + 3000);
  });

  test("when max attempts is reached, it marks job as FAILED", async () => {
    // Arrange
    const { service, repo, queue } = setup();

    queue.shouldFail = true; // simulate queue failure

    repo.saveJob({
      action: OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      payload: { orderId: "ord_123" },
    });

    repo.getAllEntries()[0]!.attempts = 2; // set previous attempts counter

    // Act
    await service.execute(new OutboxProcessorCommand(3));

    // Assert
    const entry = repo.getAllEntries()[0]!;
    expect(entry.status).toBe(OutboxStatus.FAILED);
    expect(entry.attempts).toBe(3);
    expect(entry.processedAt).toBeInstanceOf(Date);
    expect(entry.errorMessage).toBe("Queue.add() failed");
  });

  test("when multiple jobs processed at the same time and one fails, it doesn't affect the processing of other jobs", async () => {
    // Arrange
    const { service, repo, queue } = setup();

    await repo.saveJob({
      action: OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      payload: { orderId: "ord_1" },
    });
    await repo.saveJob({
      action: OutboxAction.DELETE_ORDER_IN_SHIPPING_API,
      payload: { orderId: "ord_2" },
    });

    // Make the queue fail on the first call only
    let callCount = 0;
    queue.add = async (name, data, opts) => {
      callCount++;
      if (callCount === 1) throw new Error("Transient failure");
      queue.addedJobs.push({ name, data, opts });
      return { id: `job_${callCount}` } as any;
    };

    // Act
    await service.execute(new OutboxProcessorCommand(3));

    // Assert
    const entries = repo.getAllEntries();
    expect(entries[0]!.status).toBe(OutboxStatus.PENDING); // first job retried
    expect(entries[0]!.attempts).toBe(1);
    expect(entries[1]!.status).toBe(OutboxStatus.COMPLETED); // second job succeeded
    expect(queue.addedJobs).toHaveLength(1); // only second job made it to queue
  });

  test("when a job retries for a 2nd time and fails, it uses a 4 second backoff for the next attempt", async () => {
    // Arrange
    const { service, repo, queue } = setup();

    queue.shouldFail = true;

    await repo.saveJob({
      action: OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      payload: { orderId: "ord_123" },
    });

    repo.getAllEntries()[0]!.attempts = 1; // Already failed once

    // Act
    const before = Date.now();
    await service.execute(new OutboxProcessorCommand(3));
    const after = Date.now();

    // Assert
    const entry = repo.getAllEntries()[0]!;
    expect(entry.attempts).toBe(2);
    expect(entry.scheduledAt.getTime()).toBeGreaterThanOrEqual(before + 4000); // 2^2 * 1000
    expect(entry.scheduledAt.getTime()).toBeLessThanOrEqual(after + 5000);
  });
});
