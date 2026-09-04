import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DidUserRateProductQuery } from "../../queries/did-user-rate-product.query.js";
import type { RatingQueries } from "../../read-models/rating.queries.js";

export class DidUserRateProductService {
  private logger = createLogger("DidUserRateProductService");

  constructor(
    private ratingQueries: RatingQueries,
    private userRepository: UserRepository,
    private productRepository: ProductRepository,
  ) {}

  async execute(
    query: DidUserRateProductQuery,
  ): Promise<{ didUserRate: boolean }> {
    this.logger.info("DidUserRateProductService.execute called");

    const [user, product] = await Promise.all([
      this.userRepository.find(UserId.of(query.userId)),
      this.productRepository.find(ProductId.of(query.productId)),
    ]);

    if (!user) throw new NotFoundError("user", query.userId);
    if (!product) throw new NotFoundError("product", query.productId);

    const rating = await this.ratingQueries.find(
      UserId.of(query.userId),
      ProductId.of(query.productId),
    );

    return { didUserRate: !!rating };
  }
}
