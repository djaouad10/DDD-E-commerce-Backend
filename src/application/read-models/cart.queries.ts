import type { UserId } from "#/domain/value-objects/user-id.js";
import type { CartDTO } from "../../domain/entities-snapshots/cart.dto.js";

export type CartQueries = {
  getCartByUserId: (userId: UserId) => Promise<CartDTO | null>;
};
