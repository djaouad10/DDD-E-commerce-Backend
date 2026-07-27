import type { OutboxAction } from "#/application/repositories/outbox.repository.js";
import type { OrderSnapshot } from "#/domain/entities-snapshots/order.snapshot.js";

export type OutboxJobPayloads = {
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: {
    order: OrderSnapshot;
  };
  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: {
    trackingNumber: string;
  };
  [OutboxAction.UPDATE_ORDER_IN_SHIPPING_API]: {
    order: OrderSnapshot;
  };
  [OutboxAction.DELETE_ORDER_IN_SHIPPING_API]: {
    trackingNumber: string;
  };
};
