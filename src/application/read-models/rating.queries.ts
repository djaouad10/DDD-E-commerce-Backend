import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { RatingDTO } from "../dto/rating.dto.js";

export type RatingCursor = {
  userId: string;
  productId: string;
  createdAt: Date;
};

export type RatingSearchCriteria = {
  limit: number;
  productId?: ProductId;
  cursor?: RatingCursor;
  isApproved?: boolean;
};

export type RatingQueries = {
  search(criteria: RatingSearchCriteria): Promise<{
    ratings: RatingDTO[];
    nextCursor?: RatingCursor | undefined;
  }>;

  find: (userId: UserId, productId: ProductId) => Promise<RatingDTO | null>;
};
