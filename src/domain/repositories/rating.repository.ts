import type { TransactionClient } from "#/shared/types/transaction-client.js";
import type { Rating } from "../entities/rating.js";
import type { ProductId } from "../value-objects/product-id.js";
import type { UserId } from "../value-objects/user-id.js";

export type RatingRepository = {
  find(userId: UserId, productId: ProductId): Promise<Rating | null>;
  findManyByUserId(userId: UserId): Promise<Rating[]>;
  findManyByProductId(productId: ProductId): Promise<Rating[]>;
  save(rating: Rating, tx?: TransactionClient): Promise<void>;
  delete(
    userId: UserId,
    productId: ProductId,
    tx?: TransactionClient,
  ): Promise<void>;
};
