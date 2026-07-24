import type { RatingDTO } from "#/application/dto/rating.dto.js";
import type { RatingQueries } from "#/application/read-models/rating.queries.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleDrizzleErrors } from "../utils.js";

export class PostgresRatingQueries implements RatingQueries {
  private logger = createLogger("PostgresRatingQueries");

  constructor(private db: DrizzleDBClient) {}

  async find(userId: UserId, productId: ProductId): Promise<RatingDTO | null> {
    this.logger.debug("find called", { userId: userId.value, productId });

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
}
