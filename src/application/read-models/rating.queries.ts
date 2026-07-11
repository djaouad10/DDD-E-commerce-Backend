import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { RatingDTO } from "../dto/rating.dto.js";


type RatingCursor = {
    userId: UserId
    productId: ProductId
}

type RatingSearchCriteria = {
    limit: number;
    productId?: ProductId;
    cursor?: RatingCursor
    isApproved?: boolean
};

export type RatingQueries = {
  search(criteria: RatingSearchCriteria): Promise<RatingDTO[]>;

  find: (userId: UserId, productId: ProductId) => Promise<RatingDTO>;
};
