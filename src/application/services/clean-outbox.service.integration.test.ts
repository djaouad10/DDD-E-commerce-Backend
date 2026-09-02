import { Container } from "#/composition/container.js";
import { DB, OUTBOX_REPOSITORY } from "#/composition/tokens.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import {
  clearDatabase,
  createOutboxEnrtyInDB,
  getAllOutboxRowsFromDB,
  seedOutboxTableWithCompletedRows,
} from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import { CleanOutboxCommand } from "../commands/clean-outbox.command.js";
import { CleanOutboxService } from "./clean-outbox.service.js";

describe("CleanOutboxService", () => {
  let container: Container;
  let service: CleanOutboxService;

  beforeAll(() => {
    const testApp = createTestApp();

    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const outboxRepo = container.resolveSingleton(OUTBOX_REPOSITORY);

    service = new CleanOutboxService(db, outboxRepo);
  });

  beforeEach(async () => {
    await clearDatabase(container);
  });

  afterAll(async () => {
    cleanupTestApp();
  });

  describe("Success Path", () => {
    test("when called with some completed outbox rows in DB, it should delete the ones before the provided date", async () => {
      // Arrange
      const olderThan = new Date("2026-01-10T00:00:00Z");

      const jobId1 = generateOutboxId();
      const jobId2 = generateOutboxId();
      const eventId1 = generateOutboxId();

      await seedOutboxTableWithCompletedRows(container, {
        outboxActions: [
          { id: jobId1, processedAt: new Date("2026-01-01T00:00:00Z") },
          { id: jobId2, processedAt: new Date("2026-01-03T00:00:00Z") },
        ],
        outboxEvents: [
          {
            id: eventId1,
            processedAt: new Date("2026-01-05T00:00:00Z"),
          },
        ],
      });

      // Act
      await service.execute(new CleanOutboxCommand(olderThan));

      // Assert
      const outboxRows = await getAllOutboxRowsFromDB(container);

      expect(outboxRows.length).toBe(0);
    });

    test("when called with some completed outbox rows in DB, it shouldn't delete the ones after the provided date", async () => {
      // Arrange
      const olderThan = new Date("2026-01-10T00:00:00Z");

      const jobId1 = generateOutboxId();
      const jobId2 = generateOutboxId();
      const eventId1 = generateOutboxId();

      await seedOutboxTableWithCompletedRows(container, {
        outboxActions: [
          { id: jobId1, processedAt: new Date("2026-01-11T00:00:00Z") },
          { id: jobId2, processedAt: new Date("2026-01-03T00:00:00Z") },
        ],
        outboxEvents: [
          {
            id: eventId1,
            processedAt: new Date("2026-01-05T00:00:00Z"),
          },
        ],
      });

      // Act
      await service.execute(new CleanOutboxCommand(olderThan));

      // Assert
      const outboxRows = await getAllOutboxRowsFromDB(container);

      expect(outboxRows.length).toBe(1);
      expect(outboxRows[0]!.id).toBe(jobId1);
    });

    test("when called with none completed outbox rows in DB, it shouldn't delete any", async () => {
      const olderThan = new Date("2026-01-10T00:00:00Z");

      const jobId1 = generateOutboxId();
      const jobId2 = generateOutboxId();

      await seedOutboxTableWithCompletedRows(container, {
        outboxActions: [
          { id: jobId1, processedAt: new Date("2026-01-01T00:00:00Z") },
          { id: jobId2, processedAt: new Date("2026-01-03T00:00:00Z") },
        ],
        outboxEvents: [],
      });

      // create a pending outbox row
      const pendingJobId = generateOutboxId();
      await createOutboxEnrtyInDB(container, "outbox-job", {
        id: pendingJobId,
        status: "PENDING",
        processedAt: null,
      });

      // create a processing outbox row
      const processingJobId = generateOutboxId();
      await createOutboxEnrtyInDB(container, "outbox-job", {
        id: processingJobId,
        status: "PROCESSING",
        processedAt: null,
      });

      // create a failed outbox row
      const failedJobId = generateOutboxId();
      await createOutboxEnrtyInDB(container, "outbox-job", {
        id: failedJobId,
        status: "FAILED",
        processedAt: null,
      });

      // Act
      await service.execute(new CleanOutboxCommand(olderThan));

      // Assert
      const outboxRows = await getAllOutboxRowsFromDB(container);

      expect(outboxRows.length).toBe(3);

      const pendingJob = outboxRows.find((r) => r.id === pendingJobId)!;
      expect(pendingJob).toBeDefined();

      const processingJob = outboxRows.find((r) => r.id === processingJobId)!;
      expect(processingJob).toBeDefined();

      const failedJob = outboxRows.find((r) => r.id === failedJobId)!;
      expect(failedJob).toBeDefined();
    });

    test("when call with a completed outbox row in DB that was processed exactly at the provided date, it should delete it (olderThan date is inclusive)", async () => {
      // Arrange
      const olderThan = new Date("2026-01-10T00:00:00Z");

      const jobId1 = generateOutboxId();
      const jobId2 = generateOutboxId();

      await seedOutboxTableWithCompletedRows(container, {
        outboxActions: [
          { id: jobId1, processedAt: new Date("2026-01-01T00:00:00Z") },
          { id: jobId2, processedAt: olderThan },
        ],
        outboxEvents: [],
      });

      // Act
      await service.execute(new CleanOutboxCommand(olderThan));

      // Assert
      const outboxRows = await getAllOutboxRowsFromDB(container);

      expect(outboxRows.length).toBe(0);
    });
  });
});
