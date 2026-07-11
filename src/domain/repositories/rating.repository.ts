import type { Rating } from "../entities/rating.js";

export type RatingRepository = {
  find(userId: string, productId: string): Promise<Rating | null>;
  save(rating: Rating): Promise<void>;
  delete(userId: string, productId: string): Promise<void>;
};
