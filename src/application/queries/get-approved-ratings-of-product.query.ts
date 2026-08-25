import { ValidationError } from "#/shared/errors/domain-error.js";
import type { RatingCursor } from "../read-models/rating.queries.js";

export class GetApprovedRatingsOfProductQuery {
  constructor(
    public readonly productId: string,
    public readonly limit: number,
    public readonly cursor?: RatingCursor,
  ) {
    this.validate(limit);
  }

  private validate(limit: number) {
    if (limit <= 0) {
      throw new ValidationError("limit", "limit must be greater than 0");
    }
  }
}
