import type { TransactionClient } from "#/shared/types/transaction-client.js";
import type { Order } from "../entities/order.js";
import type { OrderId } from "../value-objects/order-id.js";

export type OrderRepository = {
  find: (id: OrderId) => Promise<Order | null>;
  findByTracking(trackingNumber: string): Promise<Order | null>;
  findMany: (ids: OrderId[]) => Promise<Order[]>;
  save: (order: Order, tx?: TransactionClient) => Promise<void>;
  delete: (id: OrderId, tx?: TransactionClient) => Promise<void>;
};
