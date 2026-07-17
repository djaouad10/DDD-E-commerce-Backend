import { Rating } from "#/domain/entities/rating.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleRatingSelect } from "../schema.js";

export type RatingRow = DrizzleRatingSelect;

export class PostgresRatingMapper {
  static toDomain(ratingRow: RatingRow): Rating {
    return Rating.reconstitute(
      UserId.of(ratingRow.user_id),
      ProductId.of(ratingRow.product_id),
      ratingRow.rating,
      ratingRow.comment,
      ratingRow.is_approved,
      ratingRow.created_at,
      ratingRow.updated_at,
    );
  }
}
