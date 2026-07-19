import type { Cart } from "#/domain/entities/cart.js";
import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type {
  DrizzleDBClient,
  DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { eq } from "drizzle-orm";
import {
  PostgresCartMapper,
  type CartItemRow,
} from "../mappers/postgres-cart-mapper.js";
import { cartItem } from "../schema.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { handleDrizzleErrors } from "../utils.js";
import { createLogger } from "#/shared/logging/logger.js";

export class PostgresCartRepository implements CartRepository {
  private logger = createLogger("PostgresCartRepository");
  constructor(private db: DrizzleDBClient) {}

  async findByUserId(userId: UserId): Promise<Cart> {
    this.logger.debug("findByUserId called", { userId: userId.value });

    try {
      const cartItemsRows: CartItemRow[] = await this.logger.measure(
        "db.query.cartItem.findMany",
        () => {
          return this.db.query.cartItem.findMany({
            where: eq(cartItem.user_id, userId.value),
          });
        },
      );

      const cart = PostgresCartMapper.toDomain(cartItemsRows, userId.value);

      this.logger.debug("findByUserId completed", {
        userId: userId.value,
        itemsCount: cart.getItems().length,
      });

      return cart;
    } catch (error) {
      this.logger.error("findByUserId failed", error as Error, {
        userId: userId.value,
      });

      handleDrizzleErrors(error, "PostgresCartRepository.findByUserId");
    }
  }

  async save(cart: Cart, tx: TransactionClient): Promise<void> {
    const db = (tx as DrizzleTransactionClient | undefined) ?? this.db;

    const cartItemsRows: CartItemRow[] = PostgresCartMapper.toRows(cart);

    try {
      await db.transaction(async (tx) => {
        // delete all cartItems for this user
        await tx
          .delete(cartItem)
          .where(eq(cartItem.user_id, cart.userId.value));

        // insert new cartItems
        if (cartItemsRows.length > 0) {
          await tx.insert(cartItem).values(cartItemsRows);
        }
      });
    } catch (error) {
      handleDrizzleErrors(error, "PostgresCartRepository.save");
    }
  }

  async delete(userId: UserId, tx?: TransactionClient): Promise<void> {
    const db = (tx as DrizzleTransactionClient | undefined) ?? this.db;

    try {
      await db.delete(cartItem).where(eq(cartItem.user_id, userId.value));
    } catch (error) {
      handleDrizzleErrors(error, "PostgresCartRepository.delete");
    }
  }
}
