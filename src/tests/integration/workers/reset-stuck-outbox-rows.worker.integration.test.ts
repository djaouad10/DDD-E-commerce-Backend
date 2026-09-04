import type { Container } from "#/composition/utils/container.js";
import { ResetStuckOutboxRowsWorker } from "#/infrastructure/messaging/bullmq/workers/reset-stuck-outbox-rows.worker.js";
import { sleep } from "#/shared/utils/sleep.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import {
  seedOutboxJobRow,
  getOutboxRowById,
} from "#/tests/helpers/outbox-test-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import { OutboxStatus } from "#/application/ports/persistence/outbox.repository.port.js";

describe("ResetStuckOutboxRowsWorker", () => {
  let container: Container;

  beforeAll(() => {
    const testApp = createTestApp();
    container = testApp.container;
  });

  beforeEach(async () => {
    await clearDatabase(container);
  });

  afterAll(() => {
    cleanupTestApp();
  });

  test("when an iteration is done, it resets stuck rows to PENDING", async () => {
    // Arrange
    const jobId = await seedOutboxJobRow(container, {
      status: OutboxStatus.PROCESSING,
      lockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    });

    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      stuckFor: 1000 * 60 * 60 * 24, // 1 day
      batchSize: 100,
    });

    // Act
    await worker.runIteration();

    // Assert
    const row = await getOutboxRowById(container, jobId);
    expect(row!.status).toBe(OutboxStatus.PENDING);
    expect(row!.error_message).toBe("row stuck");
  });

  test("when an iteration is done, it respects the configured batchSize when processing", async () => {
    const now = Date.now();
    const older = await seedOutboxJobRow(container, {
      status: OutboxStatus.PROCESSING,
      lockedAt: new Date(now - 2000),
    });
    const newer = await seedOutboxJobRow(container, {
      status: OutboxStatus.PROCESSING,
      lockedAt: new Date(now - 1000),
    });

    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      stuckFor: 500, // stuckBefore = now - 500ms, so both rows are stuck
      batchSize: 1,
    });

    await worker.runIteration();

    const olderRow = await getOutboxRowById(container, older);
    const newerRow = await getOutboxRowById(container, newer);

    expect(olderRow!.status).toBe(OutboxStatus.PENDING);
    expect(newerRow!.status).toBe(OutboxStatus.PROCESSING); // left for next iteration
  });

  test("when an iteration is done, it only resets rows strictly older than the configured stuckFor window", async () => {
    const stuckFor = 5 * 24 * 60 * 60 * 1000; // 5 days
    const oneHourMs = 60 * 60 * 1000;

    const stuckId = await seedOutboxJobRow(container, {
      status: OutboxStatus.PROCESSING,
      lockedAt: new Date(Date.now() - stuckFor - oneHourMs), // older -> reset
    });
    const notStuckId = await seedOutboxJobRow(container, {
      status: OutboxStatus.PROCESSING,
      lockedAt: new Date(Date.now() - stuckFor + oneHourMs), // newer -> kept
    });

    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      stuckFor,
      batchSize: 100,
    });

    await worker.runIteration();

    const stuckRow = await getOutboxRowById(container, stuckId);
    const notStuckRow = await getOutboxRowById(container, notStuckId);

    expect(stuckRow!.status).toBe(OutboxStatus.PENDING);
    expect(notStuckRow!.status).toBe(OutboxStatus.PROCESSING);
  });

  test("when start() is called, it runs multiple iterations on the configured poll interval, and stop() halts it", async () => {
    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 20,
      sleepAfterFailMs: 20,
      stuckFor: 1000 * 60 * 60 * 24,
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
    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 20,
      stuckFor: 1000 * 60 * 60 * 24,
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
    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 30,
      sleepAfterFailMs: 30,
      stuckFor: 1000 * 60 * 60 * 24,
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
    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      stuckFor: 1000 * 60 * 60 * 24,
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
    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 20,
      sleepAfterFailMs: 20,
      stuckFor: 1000 * 60 * 60 * 24,
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
    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 20,
      sleepAfterFailMs: 20,
      stuckFor: 1000 * 60 * 60 * 24,
      batchSize: 100,
    });

    await expect(worker.stop()).resolves.toBeUndefined();
  });

  test("when calling stop(), it interrupts a long poll sleep promptly instead of waiting it out", async () => {
    const worker = new ResetStuckOutboxRowsWorker(container, {
      pollIntervalMs: 5000,
      sleepAfterFailMs: 5000,
      stuckFor: 1000 * 60 * 60 * 24,
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
