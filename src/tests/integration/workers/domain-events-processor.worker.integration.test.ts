import type { Container } from "#/composition/utils/container.js";
import { sleep } from "#/shared/utils/sleep.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import {
  getOutboxRowById,
  seedOutboxDomainEventRow,
} from "#/tests/helpers/outbox-test-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import { OutboxStatus } from "#/application/ports/persistence/outbox.repository.port.js";
import {
  ANALYTICS_QUEUE,
  EMAIL_QUEUE,
  INVENTORY_QUEUE,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { DomainEventsProcessorWorker } from "#/infrastructure/messaging/bullmq/workers/domain-events-processor.worker.js";

describe("DomainEventsProcessorWorker", () => {
  let container: Container;

  beforeAll(async () => {
    const testApp = await createTestApp();
    container = testApp.container;
  });

  beforeEach(async () => {
    await clearDatabase(container);
    const emailQueue = container.resolveSingleton(EMAIL_QUEUE);
    const analyticsQueue = container.resolveSingleton(ANALYTICS_QUEUE);
    const inventoryQueue = container.resolveSingleton(INVENTORY_QUEUE);

    await emailQueue.obliterate({ force: true });
    await analyticsQueue.obliterate({ force: true });
    await inventoryQueue.obliterate({ force: true });
  });

  afterAll(() => {
    cleanupTestApp();
  });

  test("when an iteration is done, it processes pending events and marks them COMPLETED", async () => {
    // Arrange
    const eventId = await seedOutboxDomainEventRow(
      container,
      DomainEventCode.ORDER_CREATED,
    );

    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      maxPublicationAttempts: 5,
      batchSize: 100,
    });

    // Act
    await worker.runIteration();

    // Assert
    const row = await getOutboxRowById(container, eventId);
    expect(row!.status).toBe(OutboxStatus.COMPLETED);
    expect(row!.processed_at).not.toBeNull();
  });

  test("when an iteration is done, it respects the configured batchSize when processing", async () => {
    const now = Date.now();
    const older = await seedOutboxDomainEventRow(
      container,
      DomainEventCode.ORDER_CREATED,
      {
        scheduledAt: new Date(now - 2000),
        status: OutboxStatus.PENDING,
      },
    );

    const newer = await seedOutboxDomainEventRow(
      container,
      DomainEventCode.ORDER_CREATED,
      {
        scheduledAt: new Date(now - 1000),
        status: OutboxStatus.PENDING,
      },
    );

    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      maxPublicationAttempts: 5,
      batchSize: 1,
    });

    await worker.runIteration();

    const olderRow = await getOutboxRowById(container, older);
    const newerRow = await getOutboxRowById(container, newer);

    expect(olderRow!.status).toBe(OutboxStatus.COMPLETED);
    expect(newerRow!.status).toBe(OutboxStatus.PENDING); // left for next iteration
  });

  test("when start() is called, it runs multiple iterations on the configured poll interval, and stop() halts it", async () => {
    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 20,
      sleepAfterFailMs: 20,
      maxPublicationAttempts: 5,
      batchSize: 100,
    });

    const runIterationSpy = vitest
      .spyOn(worker, "runIteration")
      .mockResolvedValue(undefined);

    worker.start();
    await sleep(100);
    await worker.stop();

    expect(runIterationSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

    const callsAfterStop = runIterationSpy.mock.calls.length;
    await sleep(100);
    expect(runIterationSpy.mock.calls.length).toBe(callsAfterStop);
  });

  test("when an iteration throws in the worker, it sleeps sleepAfterFailMs and retries rather than crashing", async () => {
    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 20,
      maxPublicationAttempts: 5,
      batchSize: 100,
    });

    const runIterationSpy = vitest
      .spyOn(worker, "runIteration")
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(undefined);

    worker.start();
    await sleep(60);
    await worker.stop();

    expect(runIterationSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test("when calling start() after a previous stop(), it creates a fresh abort signal so sleeps aren't immediately skipped", async () => {
    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 30,
      sleepAfterFailMs: 30,
      maxPublicationAttempts: 5,
      batchSize: 100,
    });

    const runIterationSpy = vitest
      .spyOn(worker, "runIteration")
      .mockResolvedValue(undefined);

    worker.start();
    await sleep(80);
    await worker.stop();
    const callsBeforeRestart = runIterationSpy.mock.calls.length;

    worker.start();
    await sleep(50);
    await worker.stop();

    const callsDuringWindow =
      runIterationSpy.mock.calls.length - callsBeforeRestart;
    expect(callsDuringWindow).toBeLessThanOrEqual(3);
  });

  test("when stop() is called, it waits for an in-flight iteration to finish rather than abandoning it", async () => {
    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      maxPublicationAttempts: 5,
      batchSize: 100,
    });

    let iterationFinished = false;
    vitest.spyOn(worker, "runIteration").mockImplementation(async () => {
      await sleep(80);
      iterationFinished = true;
    });

    worker.start();
    await sleep(10);
    await worker.stop();

    expect(iterationFinished).toBe(true);
  });

  test("when calling start() twice, it does not spawn a second loop", async () => {
    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 20,
      sleepAfterFailMs: 20,
      maxPublicationAttempts: 5,
      batchSize: 100,
    });

    const runIterationSpy = vitest
      .spyOn(worker, "runIteration")
      .mockResolvedValue(undefined);

    worker.start();
    worker.start();
    await sleep(60);
    await worker.stop();

    expect(runIterationSpy.mock.calls.length).toBeLessThanOrEqual(4);
  });

  test("when calling stop() on a worker that was never started, it resolves without throwing", async () => {
    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 20,
      sleepAfterFailMs: 20,
      maxPublicationAttempts: 5,
      batchSize: 100,
    });

    await expect(worker.stop()).resolves.toBeUndefined();
  });

  test("when calling stop(), it interrupts a long poll sleep promptly instead of waiting it out", async () => {
    const worker = new DomainEventsProcessorWorker(container, {
      pollIntervalMs: 5000,
      sleepAfterFailMs: 5000,
      maxPublicationAttempts: 5,
      batchSize: 100,
    });

    vitest.spyOn(worker, "runIteration").mockResolvedValue(undefined);

    worker.start();
    await sleep(20);

    const stopStartedAt = Date.now();
    await worker.stop();
    const stopDurationMs = Date.now() - stopStartedAt;

    expect(stopDurationMs).toBeLessThan(200);
  });
});
