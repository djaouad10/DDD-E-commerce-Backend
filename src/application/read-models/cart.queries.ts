import type { UserId } from "#/domain/value-objects/user-id.js";
import type { CartDTO } from "../dto/cart.dto.js";

export type CartQueries = {
  getCartByUserId: (userId: UserId) => Promise<CartDTO | null>;
};
