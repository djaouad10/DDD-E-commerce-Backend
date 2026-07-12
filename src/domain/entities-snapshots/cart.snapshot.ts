import type { CartItemSnapshot } from "./cart-item.snapshot.js";

export type CartSnapshot = {
  id: string;
  userId: string;
  items: CartItemSnapshot[];
  updatedAt: string;
};
