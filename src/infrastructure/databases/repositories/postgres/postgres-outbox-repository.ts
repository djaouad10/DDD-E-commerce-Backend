import {
  OutboxCategory,
  OutboxStatus,
  type OutboxAction,
  type OutboxDomainEventEntry,
  type OutboxJobEntry,
  type OutboxRepository,
  type UpdateOutboxEntryParams,
} from "#/application/repositories/outbox.repository.js";
import type {
  DrizzleDBClient,
  DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { outbox } from "../../schema.js";

import type {
  DomainEvent,
  DomainEventCode,
} from "#/domain/events/domain-event.js";
import { generateOutboxId } from "../../outbox/utils.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { and, eq, lte } from "drizzle-orm";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
import { createLogger } from "#/shared/logging/logger.js";

export class PostgresOutboxRepository implements OutboxRepository {
  private logger = createLogger("PostgresOutboxRepository");

  constructor(private db: DrizzleDBClient) {}
  async saveJob(
    params: {
      action: OutboxAction;
      payload: Record<string, unknown>;
      scheduledAt?: Date;
    },
    tx?: TransactionClient,
  ): Promise<void> {
    this.logger.debug("saveJob called", { action: params.action });

    const db = (tx as DrizzleTransactionClient | undefined) ?? this.db;

    try {
      await this.logger.measure("db.insert(outbox)", () =>
        db.insert(outbox).values({
          id: generateOutboxId(),
          category: OutboxCategory.OUTBOX_JOB,
          event_type: params.action,
          payload: params.payload,
          status: OutboxStatus.PENDING,
          attempts: 0,
          scheduledAt: params.scheduledAt ?? new Date(),
        }),
      );

      this.logger.debug("saveJob completed", { action: params.action });
    } catch (error) {
      this.logger.error("saveJob failed", error as Error, {
        action: params.action,
      });

      handleDrizzleErrors(error, "PostgresOutboxRepository.saveJob");
    }
  }

  async saveEvents(
    events: DomainEvent[],
    tx?: TransactionClient,
  ): Promise<void> {
    this.logger.debug("saveEvents called", { eventsCount: events.length });

    if (events.length === 0) {
      this.logger.debug("saveEvents completed");

      return;
    }

    const db = (tx as DrizzleTransactionClient | undefined) ?? this.db;

    const outboxRows = events.map((event) => ({
      id: generateOutboxId(),
      category: OutboxCategory.DOMAIN_EVENT,
      event_type: event.eventType,
      payload: event,
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: new Date(),
      aggregate_id: event.aggregateId,
    }));

    try {
      await this.logger.measure("db.insert(outbox)", () =>
        db.insert(outbox).values(outboxRows),
      );

      this.logger.debug("saveEvents completed", { eventsCount: events.length });
    } catch (error) {
      this.logger.error("saveEvents failed", error as Error, {
        eventsCount: events.length,
      });

      handleDrizzleErrors(error, "PostgresOutboxRepository.saveEvents");
    }
  }

  // Methods used by infrastructure workers, NOT part of the application interface:

  async getPendingJobs(limit = 100): Promise<OutboxJobEntry[]> {
    this.logger.debug("getPendingJobs called");

    try {
      const outboxJobRows = await this.logger.measure(
        "db.query.outbox.findMany",
        () =>
          this.db.query.outbox.findMany({
            where: and(
              eq(outbox.category, OutboxCategory.OUTBOX_JOB),
              eq(outbox.status, OutboxStatus.PENDING),

              lte(outbox.scheduledAt, new Date()),
            ),
            orderBy: (outbox, { asc }) => [
              asc(outbox.scheduledAt),
              asc(outbox.created_at),
            ],
            limit,
          }),
      );

      const outboxJobRowsToReturn: OutboxJobEntry[] = outboxJobRows.map(
        (row) => ({
          id: row.id,
          payload: row.payload,
          status: row.status,
          attempts: row.attempts,
          scheduledAt: row.scheduledAt,
          processedAt: row.processed_at,
          errorMessage: row.error_message,
          createdAt: row.created_at,
          category: OutboxCategory.OUTBOX_JOB, // to statisfy the OutboxJobEntry type
          eventType: row.event_type as OutboxAction, // this cast is safe because we know the event_type is a valid OutboxAction when the category is OUTBOX_JOB
        }),
      );

      this.logger.debug("getPendingJobs completed", {
        jobsCount: outboxJobRowsToReturn.length,
      });

      return outboxJobRowsToReturn;
    } catch (error) {
      this.logger.error("getPendingJobs failed", error as Error);

      handleDrizzleErrors(error, "PostgresOutboxRepository.getPendingJobs");
    }
  }

  async getPendingEvents(limit = 100): Promise<OutboxDomainEventEntry[]> {
    this.logger.debug("getPendingEvents called");

    try {
      const outboxDomainEventRows = await this.logger.measure(
        "db.query.outbox.findMany",
        () =>
          this.db.query.outbox.findMany({
            where: and(
              eq(outbox.category, OutboxCategory.DOMAIN_EVENT),
              eq(outbox.status, OutboxStatus.PENDING),
              lte(outbox.scheduledAt, new Date()),
            ),
            orderBy: (outbox, { asc }) => [
              asc(outbox.scheduledAt),
              asc(outbox.created_at),
            ],
            limit,
          }),
      );

      const outboxDomainEventRowsToReturn: OutboxDomainEventEntry[] =
        outboxDomainEventRows.map((row) => ({
          id: row.id,
          payload: row.payload,
          status: row.status,
          attempts: row.attempts,
          scheduledAt: row.scheduledAt,
          processedAt: row.processed_at,
          errorMessage: row.error_message,
          createdAt: row.created_at,
          aggregateId: row.aggregate_id,
          category: OutboxCategory.DOMAIN_EVENT, // to statisfy the OutboxDomainEventEntry type
          eventType: row.event_type as DomainEventCode, // this cast is safe because we know the event_type is a valid DomainEventCode when the category is DOMAIN_EVENT
        }));

      this.logger.debug("getPendingEvents completed", {
        eventsCount: outboxDomainEventRowsToReturn.length,
      });

      return outboxDomainEventRowsToReturn;
    } catch (error) {
      this.logger.error("getPendingEvents failed", error as Error);

      handleDrizzleErrors(error, "PostgresOutboxRepository.getPendingEvents");
    }
  }

  async updateRow(params: UpdateOutboxEntryParams): Promise<void> {
    this.logger.debug("updateRow called", { id: params.id });

    const { id: rowId, ...updateParams } = params;

    try {
      await this.logger.measure("db.update(outbox)", () =>
        this.db
          .update(outbox)
          .set({
            ...(updateParams.status === "COMPLETED" && {
              status: updateParams.status,
              processed_at: updateParams.processedAt,
              attempts: updateParams.attempts,
            }),
            ...(updateParams.status === "FAILED" && {
              processed_at: updateParams.processedAt,
              error_message: updateParams.errorMessage,
              status: updateParams.status,
              attempts: updateParams.attempts,
            }),
            ...(updateParams.status === "PROCESSING" && {
              status: updateParams.status,
            }),
            ...(updateParams.status === "PENDING" && {
              status: updateParams.status,
              error_message: updateParams.errorMessage,
              attempts: updateParams.attempts,
              scheduledAt: updateParams.scheduledAt,
            }),
          })
          .where(eq(outbox.id, rowId)),
      );

      this.logger.debug("updateRow completed", { id: params.id });
    } catch (error) {
      this.logger.error("updateRow failed", error as Error, { id: params.id });

      handleDrizzleErrors(error, "PostgresOutboxRepository.updateRow");
    }
  }

  async deleteCompletedRows(
    olderThan: Date,
    tx: TransactionClient,
  ): Promise<void> {
    this.logger.debug("deleteCompletedRows called", { olderThan });

    const db = tx as DrizzleTransactionClient;

    try {
      const deletedRows = await this.logger.measure("db.delete(outbox)", () =>
        db
          .delete(outbox)
          .where(
            and(
              eq(outbox.status, OutboxStatus.COMPLETED),
              lte(outbox.processed_at, olderThan),
            ),
          )
          .returning(),
      );

      this.logger.debug("deleteCompletedRows completed", {
        deletedRowsCount: deletedRows.length,
      });
    } catch (error) {
      this.logger.error("deleteCompletedRows failed", error as Error, {
        olderThan,
      });

      handleDrizzleErrors(
        error,
        "PostgresOutboxRepository.deleteCompletedRows",
      );
    }
  }
}
