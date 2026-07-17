import type { OutboxAction } from "#/application/repositories/outbox.repository.js";
import type { DomainEventType } from "#/domain/events/domain-event.js";
import type { DrizzleOutboxSelect } from "../schema.js";

export const OutboxCategory = {
  OUTBOX_JOB: "outbox-job",
  DOMAIN_EVENT: "domain-event",
} as const;

export const OutboxStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type OutboxRow = DrizzleOutboxSelect;

export type OutboxJobRow = Omit<
  OutboxRow,
  "category" | "event_type" | "aggregate_id"
> & {
  category: typeof OutboxCategory.OUTBOX_JOB;
  event_type: OutboxAction;
};

export type OutboxDomainEventRow = Omit<
  OutboxRow,
  "category" | "event_type"
> & {
  category: typeof OutboxCategory.DOMAIN_EVENT;
  event_type: DomainEventType;
};

// Used only by the processor worker
export type UpdateOutboxRowParams =
  | { id: string; status: typeof OutboxStatus.COMPLETED; processedAt: Date }
  | {
      id: string;
      status: typeof OutboxStatus.FAILED;
      errorMessage: string;
      processedAt: Date;
    }
  | { id: string; status: typeof OutboxStatus.PROCESSING }
  | {
      id: string;
      status: typeof OutboxStatus.PENDING;
      attempts: number;
      scheduledAt: Date;
      errorMessage?: string;
    };
