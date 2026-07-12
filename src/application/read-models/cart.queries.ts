import type { UserId } from "#/domain/value-objects/user-id.js";
import type { CartDTO } from "../dto/cart.dto.js";

export type CartQueries = {
  // doesn't require an aggregate
  getCartByUserId: (userId: UserId) => Promise<CartDTO | null>;
};
