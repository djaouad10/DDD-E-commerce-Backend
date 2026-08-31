import type {
  OutboxAction,
  OutboxRepository,
  OutboxJobEntry,
  OutboxDomainEventEntry,
  UpdateOutboxEntryParams,
} from "#/application/repositories/outbox.repository.js";
import { OutboxCategory } from "#/application/repositories/outbox.repository.js";
import type {
  DomainEvent,
  DomainEventCode,
} from "#/domain/events/domain-event.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { generateOutboxId } from "../../outbox/utils.js";
import { OutboxStatus } from "#/application/repositories/outbox.repository.js";

type InMemoryEntry =
  | {
      id: string;
      category: typeof OutboxCategory.OUTBOX_JOB;
      action: OutboxAction;
      payload: Record<string, unknown>;
      status: OutboxStatus;
      attempts: number;
      scheduledAt: Date;
      createdAt: Date;
      processedAt?: Date;
      errorMessage?: string;
    }
  | {
      id: string;
      category: typeof OutboxCategory.DOMAIN_EVENT;
      eventType: string;
      payload: DomainEvent;
      status: OutboxStatus;
      attempts: number;
      scheduledAt: Date;
      createdAt: Date;
      aggregateId: string;
      processedAt?: Date;
      errorMessage?: string;
    };

export class InMemoryOutboxRepository implements OutboxRepository {
  private entries: InMemoryEntry[] = [];

  async saveJob(
    params: {
      action: OutboxAction;
      payload: Record<string, unknown>;
      scheduledAt?: Date;
    },
    _tx?: TransactionClient,
  ): Promise<void> {
    this.entries.push({
      id: generateOutboxId(),
      category: OutboxCategory.OUTBOX_JOB,
      action: params.action,
      payload: params.payload,
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: params.scheduledAt ?? new Date(),
      createdAt: new Date(),
    });
  }

  async saveEvents(
    events: DomainEvent[],
    _tx?: TransactionClient,
  ): Promise<void> {
    for (const event of events) {
      this.entries.push({
        id: generateOutboxId(),
        category: OutboxCategory.DOMAIN_EVENT,
        eventType: event.eventType,
        payload: event,
        status: OutboxStatus.PENDING,
        attempts: 0,
        scheduledAt: new Date(),
        createdAt: new Date(),
        aggregateId: event.aggregateId,
      });
    }
  }

  async getPendingJobs(limit = 100): Promise<OutboxJobEntry[]> {
    const now = new Date();

    return this.entries
      .filter(
        (
          entry,
        ): entry is Extract<
          InMemoryEntry,
          { category: typeof OutboxCategory.OUTBOX_JOB }
        > => {
          return (
            entry.category === OutboxCategory.OUTBOX_JOB &&
            entry.status === OutboxStatus.PENDING &&
            entry.scheduledAt <= now
          );
        },
      )
      .sort((a, b) => {
        const scheduledDiff = a.scheduledAt.getTime() - b.scheduledAt.getTime();
        if (scheduledDiff !== 0) return scheduledDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, limit)
      .map((entry) => ({
        id: entry.id,
        category: entry.category,
        eventType: entry.action,
        action: entry.action,
        payload: entry.payload,
        status: entry.status,
        attempts: entry.attempts,
        scheduledAt: entry.scheduledAt,
        createdAt: entry.createdAt,
        processedAt: entry.processedAt ?? null,
        errorMessage: entry.errorMessage ?? null,
      }));
  }

  async getPendingEvents(limit = 100): Promise<OutboxDomainEventEntry[]> {
    const now = new Date();

    return this.entries
      .filter(
        (
          entry,
        ): entry is Extract<
          InMemoryEntry,
          { category: typeof OutboxCategory.DOMAIN_EVENT }
        > => {
          return (
            entry.category === OutboxCategory.DOMAIN_EVENT &&
            entry.status === OutboxStatus.PENDING &&
            entry.scheduledAt <= now
          );
        },
      )
      .sort((a, b) => {
        const scheduledDiff = a.scheduledAt.getTime() - b.scheduledAt.getTime();
        if (scheduledDiff !== 0) return scheduledDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, limit)
      .map((entry) => ({
        id: entry.id,
        category: entry.category,
        eventType: entry.eventType as DomainEventCode,
        payload: entry.payload,
        status: entry.status,
        attempts: entry.attempts,
        scheduledAt: entry.scheduledAt,
        createdAt: entry.createdAt,
        aggregateId: entry.aggregateId,
        processedAt: entry.processedAt ?? null,
        errorMessage: entry.errorMessage ?? null,
      }));
  }

  async updateRow(params: UpdateOutboxEntryParams): Promise<void> {
    const entry = this.entries.find((e) => e.id === params.id);
    if (!entry) return;

    const { id: _id, ...updates } = params;

    // Type-safe update — Object.assign handles all union variants
    Object.assign(entry, updates);
  }

  async deleteCompletedRows(olderThan: Date): Promise<void> {
    this.entries = this.entries.filter((e) => {
      if (e.status === OutboxStatus.COMPLETED) {
        if (e.processedAt && e.processedAt <= olderThan) {
          return false; // should be deleted
        }
      }
      return true; // should not be deleted
    });
  }

  async getStuckRows(
    batchSize: number,
    stuckBefore: Date,
  ): Promise<(OutboxJobEntry | OutboxDomainEventEntry)[]> {
    const rows = this.entries
      .filter((e) => {
        if (e.status === OutboxStatus.PROCESSING) {
          if (e.processedAt && e.scheduledAt <= stuckBefore) {
            return true;
          }
        }
        return false;
      })
      .slice(0, batchSize);

    const eventRows: (OutboxDomainEventEntry | undefined)[] = rows.map(
      (row) => {
        if (row.category !== OutboxCategory.DOMAIN_EVENT) return;

        return {
          id: row.id,
          category: row.category,
          eventType: row.eventType as DomainEventCode,
          payload: row.payload,
          status: row.status,
          attempts: row.attempts,
          scheduledAt: row.scheduledAt,
          createdAt: row.createdAt,
          aggregateId: row.aggregateId,
          processedAt: row.processedAt ?? null,
          errorMessage: row.errorMessage ?? null,
        };
      },
    );

    const jobRows: (OutboxJobEntry | undefined)[] = rows.map((row) => {
      if (row.category !== OutboxCategory.OUTBOX_JOB) return;

      return {
        id: row.id,
        eventType: row.action,
        category: row.category,
        action: row.action,
        payload: row.payload,
        status: row.status,
        attempts: row.attempts,
        scheduledAt: row.scheduledAt,
        createdAt: row.createdAt,
        processedAt: row.processedAt ?? null,
        errorMessage: row.errorMessage ?? null,
      };
    });

    return [...eventRows, ...jobRows].filter(
      (row): row is OutboxJobEntry | OutboxDomainEventEntry => !!row,
    );
  }
  // ── Test helpers (not part of interface) ──

  getAllEntries(): InMemoryEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }

  getEntry(id: string): InMemoryEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }
}
