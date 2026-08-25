import type {
  ProductLowStockDTO,
  ProductSearchDTO,
  ProductStaticDataDTO,
} from "#/application/dto/product.dto.js";
import type {
  ProductCursor,
  ProductQueries,
  ProductSearchCriteria,
} from "#/application/read-models/product.queries.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { and, avg, eq, inArray, sql } from "drizzle-orm";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
import { cartItem, rating, variation } from "../../schema.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type {
  VariationDTO,
  VariationWithCartItemDTO,
} from "#/application/dto/variation.dto.js";
import type { VariationId } from "#/domain/value-objects/variation-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";

export class PostgresProductQueries implements ProductQueries {
  private logger = createLogger("PostgresProductQueries");

  constructor(private db: DrizzleDBClient) {}

  async search(criteria: ProductSearchCriteria): Promise<{
    products: ProductSearchDTO[];
    nextCursor?: ProductCursor | undefined;
  }> {
    this.logger.debug("search called", { criteria });

    try {
      const productRows = await this.logger.measure(
        "db.query.product.findMany",
        () =>
          this.db.query.product.findMany({
            where: (product, { eq, gt, and, lte, gte, or }) => {
              const conditions = [];

              if (criteria.categoryId) {
                conditions.push(
                  eq(product.categoryId, criteria.categoryId.value),
                );
              }

              const effectivePrice = sql<number>`COALESCE(${product.discount_price}, ${product.price})`;

              if (criteria.max_price) {
                conditions.push(lte(effectivePrice, criteria.max_price.amount));
              }

              if (criteria.min_price) {
                conditions.push(gte(effectivePrice, criteria.min_price.amount));
              }

              if (!criteria.cursor) {
                return and(...conditions);
              }

              return and(
                ...conditions,
                or(
                  gt(product.created_at, criteria.cursor.createdAt),
                  and(
                    eq(product.created_at, criteria.cursor.createdAt),
                    gt(product.id, criteria.cursor.productId),
                  ),
                ),
              );
            },
            orderBy: (product, { asc }) => [
              asc(product.created_at),
              asc(product.id),
            ],
            limit: criteria.limit + 1,
            columns: {
              id: true,
              name: true,
              slug: true,
              description: true,
              brand: true,
              material: true,
              price: true,
              discount_price: true,
              categoryId: true,
              created_at: true,
              updated_at: true,
            },
            with: {
              category: true,
              images: true,
            },
          }),
      );

      if (productRows.length === 0) {
        return { products: [], nextCursor: undefined };
      }

      const ratings = await this.logger.measure("db.select.from.rating", () =>
        this.db
          .select({
            productId: rating.product_id,
            avg: avg(rating.rating).mapWith(Number),
          })
          .from(rating)
          .where(
            inArray(
              rating.product_id,
              productRows.map((row) => row.id),
            ),
          )
          .groupBy(rating.product_id),
      );

      const ratingMap = new Map(ratings.map((r) => [r.productId, r.avg]));

      const hasNextPage = productRows.length > criteria.limit;

      const rowsToReturn = hasNextPage
        ? productRows.slice(0, criteria.limit)
        : productRows;

      const productsToReturn: ProductSearchDTO[] = rowsToReturn.map((row) => {
        const mainImage = row.images.find((i) => i.is_main);
        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description,
          brand: row.brand,
          material: row.material,
          price: {
            amount: row.price,
            currency: "DZD",
          },
          discountedPrice: row.discount_price
            ? {
                amount: row.discount_price,
                currency: "DZD",
              }
            : null,
          category: row.category,
          mainImage: mainImage
            ? {
                name: mainImage.name,
                url: mainImage.public_url,
              }
            : null,
          averageRating: ratingMap.get(row.id) ?? null,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        };
      });

      const nextCursor: ProductCursor | undefined = hasNextPage
        ? {
            productId: rowsToReturn[rowsToReturn.length - 1]!.id,
            createdAt: rowsToReturn[rowsToReturn.length - 1]!.created_at,
          }
        : undefined;

      this.logger.debug("search completed", {
        productsCount: productsToReturn.length,
      });

      return { products: productsToReturn, nextCursor };
    } catch (error) {
      this.logger.error("search failed", error as Error, { criteria });

      handleDrizzleErrors(error, "PostgresProductQueries.search");
    }
  }

  async getLowStock(
    limit: number,
    threshold: number,
    cursor?: ProductCursor,
  ): Promise<{
    products: ProductLowStockDTO[];
    nextCursor?: ProductCursor | undefined;
  }> {
    this.logger.debug("getLowStock called", { limit, threshold });

    try {
      const productRows = await this.logger.measure(
        "db.query.product.findMany",
        () =>
          this.db.query.product.findMany({
            where: (product, { gt, exists, and, eq, or }) => {
              const conditions = [
                // Only products that have at least one low-stock variation
                exists(
                  this.db
                    .select()
                    .from(variation)
                    .where(
                      and(
                        eq(variation.product_id, product.id),
                        sql`${variation.total_qty} - ${variation.reserved_qty} <= ${threshold}`,
                      ),
                    ),
                ),
              ];

              if (!cursor) {
                return and(...conditions);
              }

              return and(
                ...conditions,
                or(
                  gt(product.created_at, cursor.createdAt),
                  and(
                    eq(product.created_at, cursor.createdAt),
                    gt(product.id, cursor.productId),
                  ),
                ),
              );
            },

            orderBy: (product, { asc }) => [
              asc(product.created_at),
              asc(product.id),
            ],
            limit: limit + 1,
            columns: {
              id: true,
              name: true,
              slug: true,
              categoryId: true,
              created_at: true,
            },
            with: {
              category: true,
              images: true,
              // Only fetch the low-stock variations
              variations: {
                where: (v, { sql }) =>
                  sql`${v.total_qty} - ${v.reserved_qty} <= ${threshold}`,
                columns: {
                  id: true,
                  size: true,
                  color: true,
                  total_qty: true,
                  reserved_qty: true,
                },
              },
            },
          }),
      );

      if (productRows.length === 0) {
        return { products: [] };
      }

      const hasNextPage = productRows.length > limit;
      const rowsToReturn = hasNextPage
        ? productRows.slice(0, limit)
        : productRows;

      const productsToReturn: ProductLowStockDTO[] = rowsToReturn.map((row) => {
        const mainImage = row.images.find((i) => i.is_main);

        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          category: row.category,
          mainImage: mainImage
            ? {
                name: mainImage.name,
                url: mainImage.public_url,
              }
            : null,
          lowStockVariations: row.variations.map((v) => ({
            size: v.size,
            color: v.color,
            id: v.id,
            totalQty: v.total_qty,
            reservedQty: v.reserved_qty,
            availableQty: v.total_qty - v.reserved_qty,
            isInStock: v.total_qty - v.reserved_qty > 0,
          })),
        };
      });

      const nextCursor: ProductCursor | undefined = hasNextPage
        ? {
            productId: rowsToReturn[rowsToReturn.length - 1]!.id,
            createdAt: rowsToReturn[rowsToReturn.length - 1]!.created_at,
          }
        : undefined;

      this.logger.debug("getLowStock completed", {
        count: productsToReturn.length,
        hasNextPage,
      });

      return { products: productsToReturn, nextCursor };
    } catch (error) {
      this.logger.error("getLowStock failed", error as Error, {
        limit,
        threshold,
        cursor,
      });
      handleDrizzleErrors(error, "PostgresProductQueries.getLowStock");
    }
  }

  async getStaticData(
    productId: ProductId,
  ): Promise<ProductStaticDataDTO | null> {
    this.logger.debug("getStaticData called", { productId });

    try {
      const [productRow, [productRating]] = await Promise.all([
        this.logger.measure("db.query.product.findFirst", () =>
          this.db.query.product.findFirst({
            where: (product, { eq }) => eq(product.id, productId.value),
            with: {
              category: true,
              images: true,
            },
          }),
        ),
        this.logger.measure("db.select.from.rating", () =>
          this.db
            .select({
              productId: rating.product_id,
              averageRating: avg(rating.rating).mapWith(Number),
            })
            .from(rating)
            .where(eq(rating.product_id, productId.value))
            .groupBy(rating.product_id),
        ),
      ]);

      if (!productRow) {
        this.logger.debug("product not found", { productId });

        return null;
      }

      const mainImage = productRow.images.find((i) => i.is_main);

      const productToReturn: ProductStaticDataDTO = {
        id: productRow.id,
        name: productRow.name,
        slug: productRow.slug,
        description: productRow.description,
        brand: productRow.brand,
        material: productRow.material,
        price: { amount: productRow.price, currency: "DZD" },
        discountedPrice: productRow.discount_price
          ? { amount: productRow.discount_price, currency: "DZD" }
          : null,
        category: productRow.category,
        averageRating: productRating?.averageRating ?? null,
        mainImage: mainImage
          ? {
              name: mainImage.name,
              url: mainImage.public_url,
            }
          : null,
        createdAt: productRow.created_at.toISOString(),
        updatedAt: productRow.updated_at.toISOString(),
      };

      this.logger.debug("getStaticData completed", {
        product: productToReturn,
      });

      return productToReturn;
    } catch (error) {
      this.logger.error("getStaticData failed", error as Error, { productId });

      handleDrizzleErrors(error, "PostgresProductQueries.getStaticData");
    }
  }

  async findVariation(variationId: VariationId): Promise<VariationDTO | null> {
    this.logger.debug("findVariation called", { variationId });

    try {
      const variationRow = await this.logger.measure(
        "db.query.variation.findFirst",
        () =>
          this.db.query.variation.findFirst({
            where: (variation, { eq }) => eq(variation.id, variationId.value),
          }),
      );

      if (!variationRow) {
        this.logger.debug("variation not found", { variationId });

        return null;
      }

      const variationToReturn: VariationDTO = {
        id: variationRow.id,
        size: variationRow.size,
        color: variationRow.color,
        totalQty: variationRow.total_qty,
        reservedQty: variationRow.reserved_qty,
        availableQty: variationRow.total_qty - variationRow.reserved_qty,
        isInStock: variationRow.total_qty - variationRow.reserved_qty > 0,
        weightInGrams: { weight: variationRow.weight_in_grams, unit: "g" },
        createdAt: variationRow.created_at.toISOString(),
        updatedAt: variationRow.updated_at.toISOString(),
      };

      this.logger.debug("findVariation completed", {
        variationId,
        variationRow,
      });

      return variationToReturn;
    } catch (error) {
      this.logger.error("findVariation failed", error as Error, {
        variationId,
      });
      handleDrizzleErrors(error, "PostgresProductQueries.findVariation");
    }
  }

  async findVariations(productId: ProductId): Promise<VariationDTO[]> {
    this.logger.debug("findVariations called", { productId });

    try {
      const variationsRows = await this.logger.measure(
        "db.query.variation.findMany",
        () =>
          this.db.query.variation.findMany({
            where: (variation, { eq }) =>
              eq(variation.product_id, productId.value),
          }),
      );

      const variationsToReturn: VariationDTO[] = variationsRows.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        totalQty: v.total_qty,
        reservedQty: v.reserved_qty,
        availableQty: v.total_qty - v.reserved_qty,
        isInStock: v.total_qty - v.reserved_qty > 0,
        weightInGrams: { weight: v.weight_in_grams, unit: "g" },
        createdAt: v.created_at.toISOString(),
        updatedAt: v.updated_at.toISOString(),
      }));

      this.logger.debug("findVariations completed", {
        variationsCount: variationsToReturn.length,
      });

      return variationsToReturn;
    } catch (error) {
      this.logger.error("findVariations failed", error as Error, { productId });
      handleDrizzleErrors(error, "PostgresProductQueries.findVariations");
    }
  }

  async findVariationsWithCartItems(
    productId: ProductId,
    userId: UserId,
  ): Promise<VariationWithCartItemDTO[]> {
    this.logger.debug("findVariationsWithCartItems called", {
      productId: productId.value,
      userId: userId.value,
    });

    try {
      const rows = await this.logger.measure(
        "db.select.variations.leftJoin.cartItem",
        () =>
          this.db
            .select({
              id: variation.id,
              productId: variation.product_id,
              size: variation.size,
              color: variation.color,
              totalQty: variation.total_qty,
              reservedQty: variation.reserved_qty,
              weightInGrams: variation.weight_in_grams,
              createdAt: variation.created_at,
              updatedAt: variation.updated_at,
              cartItemId: cartItem.id,
            })
            .from(variation)
            .leftJoin(
              cartItem,
              and(
                eq(cartItem.variation_id, variation.id),
                eq(cartItem.user_id, userId.value),
              ),
            )
            .where(eq(variation.product_id, productId.value)),
      );

      const results: VariationWithCartItemDTO[] = rows.map((row) => ({
        id: row.id,
        size: row.size,
        color: row.color,
        totalQty: row.totalQty,
        reservedQty: row.reservedQty,
        availableQty: row.totalQty - row.reservedQty,
        isInStock: row.totalQty - row.reservedQty > 0,
        weightInGrams: { weight: row.weightInGrams, unit: "g" },
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        cartItemId: row.cartItemId,
      }));

      this.logger.debug("findVariationsWithCartItems completed", {
        count: results.length,
      });

      return results;
    } catch (error) {
      this.logger.error("findVariationsWithCartItems failed", error as Error, {
        productId: productId.value,
        userId: userId.value,
      });
      handleDrizzleErrors(
        error,
        "PostgresProductQueries.findVariationsWithCartItems",
      );
    }
  }
}
