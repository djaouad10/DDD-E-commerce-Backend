import type { CartItemSnapshot } from "./cart-item.dto.js";

export type CartSnapshot = {
  id: string;
  userId: string;
  items: CartItemSnapshot[];
  updatedAt: string;
};
