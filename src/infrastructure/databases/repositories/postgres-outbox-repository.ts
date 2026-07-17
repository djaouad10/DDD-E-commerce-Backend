import type {
  OutboxAction,
  OutboxRepository,
} from "#/application/repositories/outbox.repository.js";
import type {
  DrizzleDBClient,
  DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { DatabaseError } from "#/shared/errors/domain-error.js";
import { outbox } from "../schema.js";
import { OutboxCategory, OutboxStatus } from "../outbox/types.js";
import type { DomainEvent } from "#/domain/events/domain-event.js";
import { generateOutboxId } from "../outbox/utils.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";

export class PostgresOutboxRepository implements OutboxRepository {
  constructor(private db: DrizzleDBClient) {}
  async saveJob(
    params: {
      action: OutboxAction;
      payload: Record<string, unknown>;
      scheduledAt?: Date;
    },
    tx?: TransactionClient,
  ): Promise<void> {
    const db = (tx as DrizzleTransactionClient | undefined) ?? this.db;

    try {
      await db.insert(outbox).values({
        id: generateOutboxId(),
        category: OutboxCategory.OUTBOX_JOB,
        event_type: params.action,
        payload: params.payload,
        status: OutboxStatus.PENDING,
        attempts: 0,
        scheduledAt: params.scheduledAt ?? new Date(),
      });
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresOutboxRepository.saveJob",
        error,
      );
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
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresOutboxRepository.saveEvents",
        error,
      );
    }
  }
}
