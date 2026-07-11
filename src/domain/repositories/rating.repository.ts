import type { Rating } from "../entities/rating.js";
import type { ProductId } from "../value-objects/product-id.js";
import type { UserId } from "../value-objects/user-id.js";

export type RatingRepository = {
  find(userId: UserId, productId: ProductId): Promise<Rating | null>;
  save(rating: Rating): Promise<void>;
  delete(userId: UserId, productId: ProductId): Promise<void>;
};
