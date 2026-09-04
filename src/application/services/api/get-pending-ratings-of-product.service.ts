import { ProductId } from "#/domain/value-objects/product-id.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { RatingDTO } from "../../dto/rating.dto.js";
import type { GetPendingRatingsOfProductQuery } from "../../queries/get-pending-ratings-of-product.query.js";
import type {
  RatingCursor,
  RatingQueries,
} from "../../read-models/rating.queries.js";

export class GetPendingRatingsOfProductService {
  private logger = createLogger("GetPendingRatingsOfProductService");

  constructor(private ratingQueries: RatingQueries) {}

  async execute(query: GetPendingRatingsOfProductQuery): Promise<{
    ratings: RatingDTO[];
    nextCursor?: RatingCursor | undefined;
  }> {
    this.logger.info(`GetPendingRatingsOfProductService.execute called`);
    const { productId, limit, cursor } = query;

    return this.ratingQueries.search({
      productId: ProductId.of(productId),
      limit,
      isApproved: false,
      ...(cursor && { cursor }),
    });
  }
}
