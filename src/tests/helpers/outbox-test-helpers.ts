import type { Container } from "#/composition/utils/container.js";
import { outbox } from "#/infrastructure/databases/schema.js";
import { eq, inArray } from "drizzle-orm";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import {
  OutboxAction,
  OutboxCategory,
  OutboxStatus,
} from "#/application/ports/persistence/outbox.repository.port.js";
import type { DomainEventCode } from "#/domain/events/domain-event.js";
import { DRIZZLE_DB } from "#/composition/utils/tokens.js";

export type SeedOutboxJobRowOverrides = {
  id?: string;
  eventType?: OutboxAction;
  payload?: Record<string, unknown>;
  status?: OutboxStatus;
  attempts?: number;
  scheduledAt?: Date;
  processedAt?: Date | null;
  errorMessage?: string | null;
  lockedAt?: Date | null;
};

/** Seeds a single OUTBOX_JOB row with full control over every column
 *  the processor cares about (status, attempts, scheduledAt, etc). */
export async function seedOutboxJobRow(
  container: Container,
  overrides: SeedOutboxJobRowOverrides = {},
): Promise<string> {
  const db = container.resolveSingleton(DRIZZLE_DB);
  const id = overrides.id ?? generateOutboxId();

  await db.insert(outbox).values({
    id,
    category: OutboxCategory.OUTBOX_JOB,
    event_type:
      overrides.eventType ?? OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
    payload: overrides.payload ?? {},
    status: overrides.status ?? OutboxStatus.PENDING,
    attempts: overrides.attempts ?? 0,
    scheduledAt: overrides.scheduledAt ?? new Date(),
    processed_at: overrides.processedAt ?? null,
    error_message: overrides.errorMessage ?? null,
    aggregate_id: null,
    locked_at: overrides.lockedAt ?? null,
  });

  return id;
}

export type SeedOutboxDomainEventRowOverrides = {
  id?: string;
  eventType?: DomainEventCode;
  payload?: Record<string, unknown>;
  status?: OutboxStatus;
  attempts?: number;
  scheduledAt?: Date;
  processedAt?: Date | null;
  errorMessage?: string | null;
  aggregateId?: string | null;
  lockedAt?: Date | null;
};

/** Seeds a single DOMAIN_EVENT row — used to prove the processor
 *  never touches this category. */
export async function seedOutboxDomainEventRow(
  container: Container,
  eventType: DomainEventCode,
  overrides: SeedOutboxDomainEventRowOverrides = {},
): Promise<string> {
  const db = container.resolveSingleton(DRIZZLE_DB);
  const id = overrides.id ?? generateOutboxId();

  await db.insert(outbox).values({
    id,
    category: OutboxCategory.DOMAIN_EVENT,
    event_type: overrides.eventType ?? eventType,
    payload: overrides.payload ?? {},
    status: overrides.status ?? OutboxStatus.PENDING,
    attempts: overrides.attempts ?? 0,
    scheduledAt: overrides.scheduledAt ?? new Date(),
    processed_at: overrides.processedAt ?? null,
    error_message: overrides.errorMessage ?? null,
    aggregate_id: overrides.aggregateId ?? null,
    locked_at: overrides.lockedAt ?? null,
  });

  return id;
}

export async function getOutboxRowById(container: Container, id: string) {
  const db = container.resolveSingleton(DRIZZLE_DB);
  return db.query.outbox.findFirst({ where: eq(outbox.id, id) });
}

export async function getOutboxRowsByIds(container: Container, ids: string[]) {
  const db = container.resolveSingleton(DRIZZLE_DB);
  return db.query.outbox.findMany({ where: inArray(outbox.id, ids) });
}
