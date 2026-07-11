import type { CartDTO } from "../dto/cart.dto.js";

export type CartQueries = {
  getCartByUserId: (userId: string) => Promise<CartDTO | null>;
};
