import { ProductId } from "#/domain/value-objects/product-id.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { RatingDTO } from "../../dto/rating.dto.js";
import type { GetApprovedRatingsOfProductQuery } from "../../queries/get-approved-ratings-of-product.query.js";
import type {
  RatingCursor,
  RatingQueries,
} from "../../read-models/rating.queries.js";

export class GetApprovedRatingsOfProductService {
  private logger = createLogger("GetApprovedRatingsOfProductService");

  constructor(private ratingQueries: RatingQueries) {}

  async execute(query: GetApprovedRatingsOfProductQuery): Promise<{
    ratings: RatingDTO[];
    nextCursor?: RatingCursor | undefined;
  }> {
    this.logger.info(`GetApprovedRatingsOfProductService.execute called`);
    const { productId, limit, cursor } = query;

    return this.ratingQueries.search({
      productId: ProductId.of(productId),
      limit,
      isApproved: true,
      ...(cursor && { cursor }),
    });
  }
}
