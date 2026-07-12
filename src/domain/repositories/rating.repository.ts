import type { Rating } from "../entities/rating.js";
import type { ProductId } from "../value-objects/product-id.js";
import type { UserId } from "../value-objects/user-id.js";

export type RatingRepository = {
  find(userId: UserId, productId: ProductId): Promise<Rating | null>;
  findManyByUserId(userId: UserId): Promise<Rating[]>;
  findManyByProductId(productId: ProductId): Promise<Rating[]>;
  save(rating: Rating): Promise<void>;
  delete(userId: UserId, productId: ProductId): Promise<void>;
};
