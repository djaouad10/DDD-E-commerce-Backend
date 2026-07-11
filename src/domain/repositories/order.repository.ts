import type { Order } from "../entities/order.js";

export type OrderRepository = {
  find: (id: string) => Promise<Order | null>;
  save: (order: Order) => Promise<void>;
  delete: (id: string) => Promise<void>;
};
