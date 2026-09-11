import type { Container } from "#/composition/utils/container.js";
import { ORDER_REPOSITORY } from "#/composition/utils/tokens.js";
import { OrderStatus, type Order } from "#/domain/entities/order.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import { saveOrderInDB } from "./db-helpers.js";

const PATH_TO: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [],
  CONFIRMED: ["CONFIRMED"],
  PRE_TRANSIT: ["CONFIRMED", "PRE_TRANSIT"],
  SHIPPING: ["CONFIRMED", "PRE_TRANSIT", "SHIPPING"],
  DELIVERED: ["CONFIRMED", "PRE_TRANSIT", "SHIPPING", "DELIVERED"],
  RETURNED: ["CONFIRMED", "PRE_TRANSIT", "SHIPPING", "RETURNED"],
  CANCELLED: ["CANCELLED"],
  SUSPENDED: ["CONFIRMED", "PRE_TRANSIT", "SHIPPING", "SUSPENDED"],
};

const STEP_ACTIONS: Record<OrderStatus, (o: Order) => void> = {
  PENDING: () => {},
  CONFIRMED: (o) => o.confirm(),
  PRE_TRANSIT: (o) => o.markAsPreTransit(),
  SHIPPING: (o) => o.markAsShipping(),
  DELIVERED: (o) => o.markAsDelivered(),
  RETURNED: (o) => o.markAsReturned(),
  CANCELLED: (o) => o.cancel(),
  SUSPENDED: (o) => o.markAsSuspended(),
};

export async function progressOrderTo(
  container: Container,
  orderId: OrderId,
  target: OrderStatus,
  opts: { trackingNumber?: string } = {},
): Promise<Order> {
  const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
  const order = await orderRepo.find(orderId);
  if (!order) throw new Error(`order ${orderId.value} not found in DB`);

  // PRE_TRANSIT requires a tracking number to already be set.
  if (PATH_TO[target].includes("PRE_TRANSIT")) {
    order.setTrackingNumber(opts.trackingNumber ?? "TRACK000000");
  } else if (opts.trackingNumber) {
    order.setTrackingNumber(opts.trackingNumber);
  }

  for (const step of PATH_TO[target]) STEP_ACTIONS[step](order);

  await saveOrderInDB(container, order);

  const latestOrder = await orderRepo.find(orderId);

  if (!latestOrder) throw new Error(`order ${orderId.value} not found in DB`);
  // we return latest order since the last saveOrderInDB() call already increments the version in DB by one, so the current "order" variable is stale
  return latestOrder;
}

// Note:
// Order.create() sets an internal isNew = true flag; the repository uses that flag to decide INSERT vs UPDATE. If you call .confirm() on the in-memory object you built with orderFactory/setupOrderInDB and save it again, it's still flagged as new and gets re-inserted instead of updated. Re-fetching via orderRepo.find() gives you an object reconstituted with isNew = false.
