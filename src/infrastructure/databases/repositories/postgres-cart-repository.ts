import type { Cart } from "#/domain/entities/cart.js";
import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { DatabaseError } from "#/shared/errors/domain-error.js";
import { eq } from "drizzle-orm";
import {
  PostgresCartMapper,
  type CartItemRow,
} from "../mappers/postgres-cart-mapper.js";
import { cartItem } from "../schema.js";

export class PostgresCartRepository implements CartRepository {
  constructor(private db: DrizzleDBClient) {}

  async findByUserId(userId: UserId): Promise<Cart> {
    try {
      const cartItemsRows: CartItemRow[] =
        await this.db.query.cartItem.findMany({
          where: eq(cartItem.user_id, userId.value),
        });

      return PostgresCartMapper.toDomain(cartItemsRows, userId.value);
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresCartRepository.findByUserId",
        error,
      );
    }
  }
}
