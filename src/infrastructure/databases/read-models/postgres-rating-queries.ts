import type { RatingDTO } from "#/application/dto/rating.dto.js";
import type {
  RatingCursor,
  RatingQueries,
  RatingSearchCriteria,
} from "#/application/read-models/rating.queries.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleDrizzleErrors } from "../utils.js";

export class PostgresRatingQueries implements RatingQueries {
  private logger = createLogger("PostgresRatingQueries");

  constructor(private db: DrizzleDBClient) {}

  async find(userId: UserId, productId: ProductId): Promise<RatingDTO | null> {
    this.logger.debug("find called", {
      userId: userId.value,
      productId: productId.value,
    });

    try {
      const ratingRow = await this.logger.measure(
        "db.query.rating.findFirst",
        () =>
          this.db.query.rating.findFirst({
            where: (rating, { and, eq }) =>
              and(
                eq(rating.user_id, userId.value),
                eq(rating.product_id, productId.value),
              ),
          }),
      );

      if (!ratingRow) {
        this.logger.debug("rating not found", {
          userId: userId.value,
          productId,
        });
        return null;
      }

      const ratingToReturn: RatingDTO = {
        userId: userId.value,
        productId: productId.value,
        rating: ratingRow.rating,
        comment: ratingRow.comment,
        isApproved: ratingRow.is_approved,
        createdAt: ratingRow.created_at.toISOString(),
        updatedAt: ratingRow.updated_at.toISOString(),
      };

      this.logger.debug("find completed", { userId: userId.value, productId });

      return ratingToReturn;
    } catch (error) {
      this.logger.error("find failed", error as Error, {
        userId: userId.value,
        productId: productId.value,
      });

      handleDrizzleErrors(error, "PostgresRatingQueries.find");
    }
  }

  async search(criteria: RatingSearchCriteria): Promise<{
    ratings: RatingDTO[];
    nextCursor?: RatingCursor | undefined;
  }> {
    this.logger.debug("search called", { criteria });

    try {
      const { limit, isApproved, cursor, productId } = criteria;

      const ratingRows = await this.logger.measure(
        "db.query.rating.findMany",
        () =>
          this.db.query.rating.findMany({
            where: (rating, { and, eq, gt, or }) => {
              const conditions = [];

              if (isApproved !== undefined) {
                conditions.push(eq(rating.is_approved, isApproved));
              }

              if (productId) {
                conditions.push(eq(rating.product_id, productId.value));
              }

              if (!cursor) {
                return conditions.length > 0 ? and(...conditions) : undefined;
              }

              return and(
                ...conditions,
                or(
                  gt(rating.created_at, cursor.createdAt),

                  and(
                    eq(rating.created_at, cursor.createdAt),
                    gt(rating.product_id, cursor.productId),
                  ),

                  and(
                    eq(rating.created_at, cursor.createdAt),
                    eq(rating.product_id, cursor.productId),
                    gt(rating.user_id, cursor.userId),
                  ),
                ),
              );
            },
            limit: limit + 1,
            orderBy: (rating, { asc }) => [
              asc(rating.product_id),
              asc(rating.user_id),
            ],
          }),
      );

      const hasNextPage = ratingRows.length > limit;

      const rowsToReturn = hasNextPage
        ? ratingRows.slice(0, limit)
        : ratingRows;

      const ratingsToReturn: RatingDTO[] = rowsToReturn.map((row) => ({
        userId: row.user_id,
        productId: row.product_id,
        rating: row.rating,
        comment: row.comment,
        isApproved: row.is_approved,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));

      const nextCursor: RatingCursor | undefined = hasNextPage
        ? {
            createdAt: rowsToReturn[limit - 1]!.created_at,
            productId: rowsToReturn[limit - 1]!.product_id,
            userId: rowsToReturn[limit - 1]!.user_id,
          }
        : undefined;

      this.logger.debug("search completed", { nextCursor });

      return { ratings: ratingsToReturn, nextCursor };
    } catch (error) {
      this.logger.error("search failed", error as Error, { criteria });

      handleDrizzleErrors(error, "PostgresRatingQueries.search");
    }
  }
}
