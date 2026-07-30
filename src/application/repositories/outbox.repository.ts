import type {
  DomainEvent,
  DomainEventType,
} from "#/domain/events/domain-event.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";

// the OutboxRepository is defined here(application layer) instead of domain layer because the interface exists only to support application workflows or technical patterns
// if an interface accepts or returns domain entities/aggregates, it belongs to the domain layer, which is not the case here

export const OutboxAction = {
  CREATE_ORDER_IN_SHIPPING_API: "create_order_in_shipping_api",
  DELETE_ORDER_IN_SHIPPING_API: "delete_order_in_shipping_api",
  UPDATE_ORDER_IN_SHIPPING_API: "update_order_in_shipping_api",
  CREATE_SHIPMENT_IN_SHIPPING_API: "create_shipment_in_shipping_api",
} as const;

export type OutboxAction = (typeof OutboxAction)[keyof typeof OutboxAction];

export const OutboxCategory = {
  OUTBOX_JOB: "outbox-job",
  DOMAIN_EVENT: "domain-event",
} as const;

export type OutboxCategory =
  (typeof OutboxCategory)[keyof typeof OutboxCategory];

export const OutboxStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];

export type OutboxJobEntry = {
  id: string;
  category: typeof OutboxCategory.OUTBOX_JOB;
  eventType: OutboxAction;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  scheduledAt: Date;
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type OutboxDomainEventEntry = {
  id: string;
  category: typeof OutboxCategory.DOMAIN_EVENT;
  eventType: DomainEventType;
  aggregateId: string | null;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  scheduledAt: Date;
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
};

// Used only by the processor worker
export type UpdateOutboxEntryParams =
  | { id: string; status: typeof OutboxStatus.COMPLETED; processedAt: Date }
  | {
      id: string;
      status: typeof OutboxStatus.FAILED;
      attempts: number;
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

export interface OutboxRepository {
  // called by application services inside the same transaction as aggregate saves
  saveJob(
    params: {
      action: OutboxAction;
      payload: Record<string, unknown>;
      scheduledAt?: Date; // optional, defaults to now
    },
    tx?: TransactionClient,
  ): Promise<void>;

  saveEvents(events: DomainEvent[], tx?: TransactionClient): Promise<void>;

  getPendingJobs(limit: number): Promise<OutboxJobEntry[]>;

  getPendingEvents(limit: number): Promise<OutboxDomainEventEntry[]>;

  updateRow(params: UpdateOutboxEntryParams): Promise<void>;
}
