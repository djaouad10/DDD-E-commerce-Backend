import type { TransactionClient } from "#/shared/types/transaction-client.js";
import type { Cart } from "../entities/cart.js";
import type { UserId } from "../value-objects/user-id.js";

export type CartRepository = {
  findByUserId: (userId: UserId) => Promise<Cart>; // it doesn't return Promise<Cart | null>, because if a user passed the auth check then he exists in the DB, so he either has an empty cart or a cart with items

  save: (cart: Cart, tx?: TransactionClient) => Promise<void>;
  delete: (userId: UserId, tx?: TransactionClient) => Promise<void>;
};
