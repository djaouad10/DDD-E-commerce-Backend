import type { Cart } from "../entities/cart.js";
import type { UserId } from "../value-objects/user-id.js";

export type CartRepository = {
  findByUserId: (userId: UserId) => Promise<Cart | null>;
  save: (cart: Cart) => Promise<void>;
  delete: (id: UserId) => Promise<void>;
};
