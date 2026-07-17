import type { DomainEvent } from "#/domain/events/domain-event.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";

// the OutboxRepository is defined here(application layer) instead of domain layer because the interface exists only to support application workflows or technical patterns
// if an interface accepts or returns domain entities/aggregates, it belongs to the domain layer, which is not the case here

export const OutboxAction = {
  CREATE_ORDER_IN_SHIPPING_API: "create_order_in_shipping_api",
  DELETE_ORDER_IN_SHIPPING_API: "delete_order_in_shipping_api",
  UPDATE_ORDER_IN_SHIPPING_API: "update_order_in_shipping_api",
  CREATE_SHIPMENT_SHIPPING_IN_SHIPPING_API:
    "create_shipment_shipping_in_shipping_api",
} as const;

export type OutboxAction = (typeof OutboxAction)[keyof typeof OutboxAction];

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
  // the actual implementation will contain more methods like: getPendingJobs, getPendingEvents, update,... etc. but these are used by workers(infrastructure layer), the application layer is not concerned with them
}
