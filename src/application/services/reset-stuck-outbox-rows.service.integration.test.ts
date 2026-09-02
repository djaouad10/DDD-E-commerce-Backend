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
import { ResetStuckOutboxRowsService } from "./reset-stuck-outbox-rows.service.js";
import { ResetStuckOutboxRowsCommand } from "../commands/reset-stuck-outbox-rows.command.js";

describe("ResetStuckOutboxRowsService", () => {
  let container: Container;
  let outboxRepository: OutboxRepository;
  let service: ResetStuckOutboxRowsService;

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

    service = new ResetStuckOutboxRowsService(outboxRepository);
  });

  describe("Success Path", () => {
    test("when there are no stuck rows, it does nothing", async () => {
      const updateSpy = vitest.spyOn(outboxRepository, "updateRowToPending");

      await service.execute(new ResetStuckOutboxRowsCommand(100, new Date()));

      expect(updateSpy).not.toHaveBeenCalled();

      updateSpy.mockRestore();
    });

    test("resets a single stuck outbox-job row back to PENDING", async () => {
      const jobId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(Date.now() - 60_000),
      });

      await service.execute(new ResetStuckOutboxRowsCommand(100, new Date()));

      const row = await getOutboxRowById(container, jobId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.error_message).toBe("row stuck");
    });

    test("resets a single stuck domain-event row back to PENDING", async () => {
      const eventId = await seedOutboxDomainEventRow(
        container,
        DomainEventCode.ORDER_CREATED,
        {
          status: OutboxStatus.PROCESSING,
          lockedAt: new Date(Date.now() - 60_000),
        },
      );

      await service.execute(new ResetStuckOutboxRowsCommand(100, new Date()));

      const row = await getOutboxRowById(container, eventId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.error_message).toBe("row stuck");
    });

    test("resets multiple stuck rows across both categories", async () => {
      const jobIds = await Promise.all([
        seedOutboxJobRow(container, {
          status: OutboxStatus.PROCESSING,
          lockedAt: new Date(Date.now() - 60_000),
        }),
        seedOutboxJobRow(container, {
          status: OutboxStatus.PROCESSING,
          lockedAt: new Date(Date.now() - 50_000),
        }),
      ]);
      const eventIds = await Promise.all([
        seedOutboxDomainEventRow(container, DomainEventCode.ORDER_CREATED, {
          status: OutboxStatus.PROCESSING,
          lockedAt: new Date(Date.now() - 40_000),
        }),
        seedOutboxDomainEventRow(container, DomainEventCode.ORDER_CREATED, {
          status: OutboxStatus.PROCESSING,
          lockedAt: new Date(Date.now() - 30_000),
        }),
      ]);

      await service.execute(new ResetStuckOutboxRowsCommand(100, new Date()));

      for (const id of [...jobIds, ...eventIds]) {
        const row = await getOutboxRowById(container, id);
        expect(row!.status).toBe(OutboxStatus.PENDING);
      }
    });

    test("preserves an existing error message instead of overwriting it with the default", async () => {
      const jobId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(Date.now() - 60_000),
        errorMessage: "boom",
      });

      await service.execute(new ResetStuckOutboxRowsCommand(100, new Date()));

      const row = await getOutboxRowById(container, jobId);
      expect(row!.status).toBe(OutboxStatus.PENDING);
      expect(row!.error_message).toBe("boom");
    });

    test("preserves the row's existing lockedAt rather than rescheduling to now", async () => {
      const originalScheduledAt = new Date(Date.now() - 60_000);
      const jobId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        scheduledAt: originalScheduledAt,
      });

      await service.execute(new ResetStuckOutboxRowsCommand(100, new Date()));

      const row = await getOutboxRowById(container, jobId);
      expect(row!.scheduledAt.getTime()).toBe(originalScheduledAt.getTime());
    });

    test("it respects batchSize and leaves the remaining stuck rows untouched", async () => {
      const now = Date.now();
      const oldest = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(now - 30_000),
      });
      const middle = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(now - 20_000),
      });
      const newest = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(now - 10_000),
      });

      await service.execute(new ResetStuckOutboxRowsCommand(2, new Date())); // batchSize = 2

      const oldestRow = await getOutboxRowById(container, oldest);
      const middleRow = await getOutboxRowById(container, middle);
      const newestRow = await getOutboxRowById(container, newest);

      expect(oldestRow!.status).toBe(OutboxStatus.PENDING);
      expect(middleRow!.status).toBe(OutboxStatus.PENDING);
      // the most-recently-scheduled row is left for the next iteration, untouched
      expect(newestRow!.status).toBe(OutboxStatus.PROCESSING);
    });

    test("only rows scheduled before stuckBefore are considered stuck", async () => {
      const cutoff = new Date(Date.now() - 30_000);

      const genuinelyStuckId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(cutoff.getTime() - 10_000), // older than cutoff
      });
      const notYetStuckId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(cutoff.getTime() + 10_000), // newer than cutoff
      });

      await service.execute(new ResetStuckOutboxRowsCommand(100, cutoff));

      const stuckRow = await getOutboxRowById(container, genuinelyStuckId);
      const freshRow = await getOutboxRowById(container, notYetStuckId);

      expect(stuckRow!.status).toBe(OutboxStatus.PENDING);
      expect(freshRow!.status).toBe(OutboxStatus.PROCESSING);
    });

    test("it does not touch rows that are not PROCESSING", async () => {
      const oldLockedAt = new Date(Date.now() - 60_000);

      const pendingId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PENDING,
        lockedAt: oldLockedAt,
      });
      const completedId = await seedOutboxJobRow(container, {
        status: OutboxStatus.COMPLETED,
        lockedAt: oldLockedAt,
        processedAt: new Date(),
      });
      const failedId = await seedOutboxJobRow(container, {
        status: OutboxStatus.FAILED,
        lockedAt: oldLockedAt,
        processedAt: new Date(),
      });

      await service.execute(new ResetStuckOutboxRowsCommand(100, new Date()));

      const pendingRow = await getOutboxRowById(container, pendingId);
      const completedRow = await getOutboxRowById(container, completedId);
      const failedRow = await getOutboxRowById(container, failedId);

      expect(pendingRow!.status).toBe(OutboxStatus.PENDING);
      expect(completedRow!.status).toBe(OutboxStatus.COMPLETED);
      expect(failedRow!.status).toBe(OutboxStatus.FAILED);
    });
  });

  describe("Resilience to DB failures mid-iteration", () => {
    test("when updateRowToPending throws for one row, execute() skips that row and resets later rows in the batch", async () => {
      const now = Date.now();
      const firstId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(now - 20_000),
      });
      const secondId = await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(now - 10_000),
      });

      const updateSpy = vitest.spyOn(outboxRepository, "updateRowToPending");

      updateSpy.mockRejectedValueOnce(
        new Error("DB write failed while resetting"),
      );

      await service.execute(new ResetStuckOutboxRowsCommand(100, new Date()));

      expect(updateSpy).toHaveBeenCalledTimes(2);

      const firstRow = await getOutboxRowById(container, firstId);
      const secondRow = await getOutboxRowById(container, secondId);
      expect(firstRow!.status).toBe(OutboxStatus.PROCESSING); // failed to reset
      expect(secondRow!.status).toBe(OutboxStatus.PENDING);

      updateSpy.mockRestore();
    });

    test("when getStuckRows throws, execute() propagates the error and never calls updateRowToPending", async () => {
      await seedOutboxJobRow(container, {
        status: OutboxStatus.PROCESSING,
        lockedAt: new Date(Date.now() - 60_000),
      });

      const getStuckRowsSpy = vitest
        .spyOn(outboxRepository, "getStuckRows")
        .mockRejectedValueOnce(new Error("DB read failed"));

      const updateSpy = vitest.spyOn(outboxRepository, "updateRowToPending");

      await expect(
        service.execute(new ResetStuckOutboxRowsCommand(100, new Date())),
      ).rejects.toThrow("DB read failed");

      expect(updateSpy).not.toHaveBeenCalled();

      getStuckRowsSpy.mockRestore();
      updateSpy.mockRestore();
    });
  });

  describe("ResetStuckOutboxRowsCommand validation (no DB needed)", () => {
    test("throws ValidationError when batchSize is 0 or negative", () => {
      expect(() => new ResetStuckOutboxRowsCommand(0, new Date())).toThrow(
        ValidationError,
      );
      expect(() => new ResetStuckOutboxRowsCommand(-5, new Date())).toThrow(
        ValidationError,
      );
    });

    test("throws ValidationError when stuckBefore is in the future", () => {
      const future = new Date(Date.now() + 60 * 60 * 1000);

      expect(() => new ResetStuckOutboxRowsCommand(100, future)).toThrow(
        ValidationError,
      );
    });

    test("accepts a stuckBefore in the past", () => {
      const past = new Date(Date.now() - 60 * 60 * 1000);

      expect(() => new ResetStuckOutboxRowsCommand(100, past)).not.toThrow();
    });
  });
});
