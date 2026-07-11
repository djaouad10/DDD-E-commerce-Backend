import type { Cart } from "../entities/cart.js";

export type CartRepository = {
  findByUserId: (userId: string) => Promise<Cart | null>;
  save: (cart: Cart) => Promise<void>;
  delete: (id: string) => Promise<void>;
};
