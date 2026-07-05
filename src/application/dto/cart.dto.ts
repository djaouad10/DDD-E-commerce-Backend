import type { CartItemDTO } from "./cart-item.dto.js";

export type CartDTO = {
  id: string;
  userId: string;
  items: CartItemDTO[];
  updatedAt: string;
};
