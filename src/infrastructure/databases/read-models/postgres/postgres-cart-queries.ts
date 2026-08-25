import type { CartDTO, CartItemDTO } from "#/application/dto/cart.dto.js";
import type { CartQueries } from "#/application/read-models/cart.queries.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";

export class PostgresCartQueries implements CartQueries {
  private logger = createLogger("PostgresCartQueries");

  constructor(private db: DrizzleDBClient) {}

  async getCartByUserId(userId: UserId): Promise<CartDTO> {
    this.logger.debug("getCartByUserId called", { userId });

    try {
      const cartItemsRows = await this.logger.measure(
        "db.query.cartItem.findMany",
        () =>
          this.db.query.cartItem.findMany({
            where: (cartItem, { eq }) => eq(cartItem.user_id, userId.value),
            with: {
              variation: {
                with: {
                  product: {
                    with: {
                      images: true,
                      category: true,
                    },
                  },
                },
              },
            },
          }),
      );

      if (cartItemsRows.length === 0) {
        return {
          userId: userId.value,
          items: [],
          updatedAt: new Date().toISOString(),
        };
      }

      const cartItemToReturn: CartItemDTO[] = cartItemsRows.map((item) => {
        const mainItemImage = item.variation.product.images.find(
          (image) => image.is_main,
        )!;

        return {
          product: {
            id: item.variation.product.id,
            name: item.variation.product.name,
            slug: item.variation.product.slug,
            category: item.variation.product.category,
            mainImage: {
              name: mainItemImage.name,
              url: mainItemImage.public_url,
            },
          },
          variation: {
            id: item.variation.id,
            size: item.variation.size,
            color: item.variation.color,
            totalQty: item.variation.total_qty,
            reservedQty: item.variation.reserved_qty,
            availableQty:
              item.variation.total_qty - item.variation.reserved_qty,
            isInStock:
              item.variation.total_qty - item.variation.reserved_qty > 0,
            weightInGrams: {
              unit: "g",
              weight: item.variation.weight_in_grams,
            },
            createdAt: item.variation.created_at.toISOString(),
            updatedAt: item.variation.updated_at.toISOString(),
          },
          id: item.id,
          qty: item.selected_qty,
          updatedAt: item.updated_at.toISOString(),
        };
      });

      const latestUpdatedItem = cartItemToReturn.reduce((latest, current) => {
        return new Date(current.updatedAt) > new Date(latest.updatedAt)
          ? current
          : latest;
      });

      const cart: CartDTO = {
        userId: userId.value,
        items: cartItemToReturn,
        updatedAt: latestUpdatedItem.updatedAt,
      };

      this.logger.debug("getCartByUserId completed", { cart });

      return cart;
    } catch (error) {
      this.logger.error("getCartByUserId failed", error as Error, { userId });

      handleDrizzleErrors(error, "PostgresCartQueries.getCartByUserId");
    }
  }
}
