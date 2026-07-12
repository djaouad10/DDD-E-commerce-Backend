import type { Order } from "../entities/order.js";
import type { OrderId } from "../value-objects/order-id.js";

export type OrderRepository = {
  find: (id: OrderId) => Promise<Order | null>;
  findMany: (ids: OrderId[]) => Promise<Order[]>;
  save: (order: Order) => Promise<void>;
  delete: (id: OrderId) => Promise<void>;
};
