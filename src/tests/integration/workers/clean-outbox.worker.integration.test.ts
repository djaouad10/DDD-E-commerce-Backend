import type { Container } from "#/composition/container.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { CleanOutboxWorker } from "#/infrastructure/messaging/bullmq/workers/clean-outbox.worker.js";
import { sleep } from "#/shared/utils/sleep.js";
import {
  clearDatabase,
  getAllOutboxRowsFromDB,
  seedOutboxTableWithCompletedRows,
} from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";

describe("CleanOutboxWorker", () => {
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

  test("when an itteration is done, it deletes completed rows older than the configured retention", async () => {
    // Arrange
    const retentionMs = 5 * 24 * 60 * 60 * 1000; // 5 days
    const oneDayMs = 24 * 60 * 60 * 1000;

    await seedOutboxTableWithCompletedRows(container, {
      outboxActions: [
        {
          id: generateOutboxId(),
          processedAt: new Date(Date.now() - (retentionMs + oneDayMs)), // older than retention
        },
        {
          id: generateOutboxId(),
          processedAt: new Date(
            Date.now() - (retentionMs + oneDayMs * 2), // older than retention
          ),
        },
      ],
      outboxEvents: [],
    });

    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      retentionMs,
    });

    // Act
    await worker.runIteration();

    // Assert
    const outboxActions = await getAllOutboxRowsFromDB(container);
    expect(outboxActions.length).toBe(0);
  });

  test("when start() is called ,it runs multiple iterations on the configured poll interval, and stop() halts it", async () => {
    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 20, // fast, so the test doesn't wait real days
      sleepAfterFailMs: 20,
      retentionMs: 5 * 24 * 60 * 60 * 1000,
    });

    const runIterationSpy = vitest.spyOn(worker, "runIteration");

    worker.start();

    await sleep(100); // let worker run in background for a 100ms

    await worker.stop();

    expect(runIterationSpy.mock.calls.length).toBeGreaterThanOrEqual(2); // at least 3 iterations
    // 100ms is somewhat long enough for 2 iterations: (pollIntervalMs * 2 + sleepAfterFailMs + Service execution time)

    const callsAfterStop = runIterationSpy.mock.calls.length;

    await sleep(100);

    expect(runIterationSpy.mock.calls.length).toBe(callsAfterStop); // no further calls after stop
  });

  test("when an iteration throws in the worker, it should sleep sleepAfterFailMs and retries rather than crashing", async () => {
    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 20,
      retentionMs: 5 * 24 * 60 * 60 * 1000,
    });

    const runIterationSpy = vitest
      .spyOn(worker, "runIteration")
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(undefined);

    worker.start(); // worker.runIteration() is called at Ms 0, it rejects immediatly in the loop, so it retries after 20ms (it will keep failing and retrying)

    await sleep(60);

    await worker.stop();

    // it should have retried at least once after the failure, using the short sleepAfterFailMs
    expect(runIterationSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
  test("when calling start() after a previous stop(), it should create a fresh abort signal so sleeps aren't immediately skipped", async () => {
    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 30,
      sleepAfterFailMs: 30,
      retentionMs: 5 * 24 * 60 * 60 * 1000,
    });

    const runIterationSpy = vitest
      .spyOn(worker, "runIteration")
      .mockResolvedValue(undefined);

    worker.start();
    await sleep(80);
    await worker.stop();
    const callsBeforeRestart = runIterationSpy.mock.calls.length;

    // restart the SAME instance
    worker.start();
    await sleep(50); // less than 2x pollIntervalMs (enough time for at most one iteration to finish and another to be called) if it reused the already aborted controller it'll have fired way more than expected since the sleep() call between iterations would resolve immediately if the controller was already aborted

    await worker.stop();

    const callsDuringWindow =
      runIterationSpy.mock.calls.length - callsBeforeRestart;

    // with a healthy 30ms poll interval, ~50ms should yield roughly 1-2 calls,
    // not a tight busy-loop hammering the mock dozens of times
    expect(callsDuringWindow).toBeLessThanOrEqual(3);
  });

  test("stop() waits for an in-flight iteration to finish rather than abandoning it", async () => {
    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      retentionMs: 5 * 24 * 60 * 60 * 1000,
    });

    let iterationFinished = false;
    vitest.spyOn(worker, "runIteration").mockImplementation(async () => {
      await sleep(80); // simulate slow DB work
      iterationFinished = true;
    });

    worker.start();
    await sleep(10); // let the loop enter runIteration()
    // 10 ms is not enough time for runIteration() to complete, but worker.stop() should wait for it to finish before stopping the loop
    await worker.stop(); // should not resolve until the 80ms iteration completes

    expect(iterationFinished).toBe(true);
  });

  test("calling start() twice does not spawn a second loop", async () => {
    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 20,
      sleepAfterFailMs: 20,
      retentionMs: 5 * 24 * 60 * 60 * 1000,
    });

    const runIterationSpy = vitest
      .spyOn(worker, "runIteration")
      .mockResolvedValue(undefined);

    worker.start();
    worker.start(); // second call should be a no-op
    await sleep(60);
    await worker.stop();

    // if a second loop had started, we'd see roughly double the calls
    expect(runIterationSpy.mock.calls.length).toBeLessThanOrEqual(4);
  });

  test("stop() on a worker that was never started resolves without throwing", async () => {
    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 20,
      sleepAfterFailMs: 20,
      retentionMs: 5 * 24 * 60 * 60 * 1000,
    });

    await expect(worker.stop()).resolves.toBeUndefined();
  });

  test("stop() interrupts a long poll sleep promptly instead of waiting it out", async () => {
    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 5000, // deliberately long
      sleepAfterFailMs: 5000,
      retentionMs: 5 * 24 * 60 * 60 * 1000,
    });

    vitest.spyOn(worker, "runIteration").mockResolvedValue(undefined);

    worker.start();
    await sleep(20); // let it enter the long poll sleep

    const stopStartedAt = Date.now();
    await worker.stop();
    const stopDurationMs = Date.now() - stopStartedAt;

    expect(stopDurationMs).toBeLessThan(200); // should NOT take ~5000ms, it should stop immediately after runIteration() completes
  });

  test("runIteration only deletes rows strictly older than the configured retention window", async () => {
    const retentionMs = 5 * 24 * 60 * 60 * 1000;
    const oneHourMs = 60 * 60 * 1000;

    await seedOutboxTableWithCompletedRows(container, {
      outboxActions: [
        {
          id: generateOutboxId(),
          processedAt: new Date(Date.now() - retentionMs - oneHourMs),
        }, // older -> deleted
        {
          id: generateOutboxId(),
          processedAt: new Date(Date.now() - retentionMs + oneHourMs),
        }, // newer -> kept
      ],
      outboxEvents: [],
    });

    const worker = new CleanOutboxWorker(container, {
      pollIntervalMs: 1000,
      sleepAfterFailMs: 1000,
      retentionMs,
    });

    await worker.runIteration();

    const remaining = await getAllOutboxRowsFromDB(container);
    expect(remaining.length).toBe(1);
  });
});
