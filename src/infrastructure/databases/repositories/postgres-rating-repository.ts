import type { Rating } from "#/domain/entities/rating.js";
import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { DatabaseError } from "#/shared/errors/domain-error.js";
import {
  PostgresRatingMapper,
  type RatingRow,
} from "../mappers/postgres-rating-mapper.js";

export class PostgresRatingRepository implements RatingRepository {
  constructor(private db: DrizzleDBClient) {}
  async find(userId: UserId, productId: ProductId): Promise<Rating | null> {
    try {
      const ratingRow: RatingRow | undefined =
        await this.db.query.rating.findFirst({
          where: (rating, { and, eq }) =>
            and(
              eq(rating.user_id, userId.value),
              eq(rating.product_id, productId.value),
            ),
        });

      if (!ratingRow) return null;

      return PostgresRatingMapper.toDomain(ratingRow);
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresRatingRepository.find",
        error,
      );
    }
  }
}
