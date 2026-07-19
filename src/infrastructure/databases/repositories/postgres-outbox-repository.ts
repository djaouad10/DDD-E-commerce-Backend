import type {
  OutboxAction,
  OutboxRepository,
} from "#/application/repositories/outbox.repository.js";
import type {
  DrizzleDBClient,
  DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { outbox } from "../schema.js";
import {
  OutboxCategory,
  OutboxStatus,
  type OutboxDomainEventRow,
  type OutboxJobRow,
  type UpdateOutboxRowParams,
} from "../outbox/types.js";
import type {
  DomainEvent,
  DomainEventType,
} from "#/domain/events/domain-event.js";
import { generateOutboxId } from "../outbox/utils.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { and, eq, lte } from "drizzle-orm";
import { handleDrizzleErrors } from "../utils.js";
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
    if (events.length === 0) return;

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
      await db.insert(outbox).values(outboxRows);
    } catch (error) {
      handleDrizzleErrors(error, "PostgresOutboxRepository.saveEvents");
    }
  }

  // Methods used by infrastructure workers, NOT part of the application interface:

  async getPendingJobs(limit = 100): Promise<OutboxJobRow[]> {
    try {
      const outboxJobRows = await this.db.query.outbox.findMany({
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
      });

      return outboxJobRows.map((row) => ({
        ...row,
        category: OutboxCategory.OUTBOX_JOB, // to statisfy the OutboxJobRow type
        event_type: row.event_type as OutboxAction, // this cast is safe because we know the event_type is a valid OutboxAction when the category is OUTBOX_JOB
      }));
    } catch (error) {
      handleDrizzleErrors(error, "PostgresOutboxRepository.getPendingJobs");
    }
  }

  async getPendingEvents(limit = 100): Promise<OutboxDomainEventRow[]> {
    try {
      const outboxDomainEventRows = await this.db.query.outbox.findMany({
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
      });

      return outboxDomainEventRows.map((row) => ({
        ...row,
        category: OutboxCategory.DOMAIN_EVENT, // to statisfy the OutboxDomainEventRow type
        event_type: row.event_type as DomainEventType, // this cast is safe because we know the event_type is a valid DomainEventType when the category is DOMAIN_EVENT
      }));
    } catch (error) {
      handleDrizzleErrors(error, "PostgresOutboxRepository.getPendingEvents");
    }
  }

  async updateRow(params: UpdateOutboxRowParams): Promise<void> {
    const { id: rowId, ...updateParams } = params;
    try {
      await this.db
        .update(outbox)
        .set(updateParams)
        .where(eq(outbox.id, rowId));
    } catch (error) {
      handleDrizzleErrors(error, "PostgresOutboxRepository.updateRow");
    }
  }
}
