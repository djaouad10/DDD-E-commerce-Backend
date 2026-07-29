import type { Rating } from "#/domain/entities/rating.js";
import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";

export class InMemoryRatingRepository implements RatingRepository {
  private ratings: Rating[] = [];

  async find(userId: UserId, productId: ProductId): Promise<Rating | null> {
    return (
      this.ratings.find(
        (r) => r.userId.equals(userId) && r.productId.equals(productId),
      ) ?? null
    );
  }

  async findManyByProductId(productId: ProductId): Promise<Rating[]> {
    return this.ratings.filter((r) => r.productId.equals(productId));
  }
  async findManyByUserId(userId: UserId): Promise<Rating[]> {
    return this.ratings.filter((r) => r.userId.equals(userId));
  }

  async save(rating: Rating): Promise<void> {
    const index = this.ratings.findIndex(
      (r) =>
        r.userId.equals(rating.userId) && r.productId.equals(rating.productId),
    );

    if (index >= 0) {
      this.ratings[index] = rating;
    } else {
      this.ratings.push(rating);
    }
  }
  async delete(userId: UserId, productId: ProductId): Promise<void> {
    this.ratings = this.ratings.filter(
      (r) => !(r.userId.equals(userId) && r.productId.equals(productId)),
    );
  }
}
