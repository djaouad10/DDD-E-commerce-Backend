import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { VariationWithCartItemDTO } from "../dto/variation.dto.js";
import type { GetProductVariationsWithCartFlagQuery } from "../queries/get-product-variations-with-cart-flag.query.js";
import type { ProductQueries } from "../read-models/product.queries.js";

export class GetProductVariationsWithCartFlagService {
  private logger = createLogger("GetProductVariationsWithCartFlagService");

  constructor(
    private productQueries: ProductQueries,
    private productRepository: ProductRepository,
    private userRepository: UserRepository,
  ) {}

  async execute(
    query: GetProductVariationsWithCartFlagQuery,
  ): Promise<VariationWithCartItemDTO[]> {
    this.logger.info(`GetProductVariationsWithCartFlagService.execute called`);

    const [product, user] = await Promise.all([
      this.productRepository.find(ProductId.of(query.productId)),
      this.userRepository.find(UserId.of(query.userId)),
    ]);

    if (!product) throw new NotFoundError("product", query.productId);
    if (!user) throw new NotFoundError("user", query.userId);

    return this.productQueries.findVariationsWithCartItems(
      ProductId.of(query.productId),
      UserId.of(query.userId),
    );
  }
}
