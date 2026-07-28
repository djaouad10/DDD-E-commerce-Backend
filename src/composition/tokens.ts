import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";

// Infrastructure tokens
export const DB = Symbol("db") as symbol & { __type: DrizzleDBClient }; // this __type is what allows TS later to infer the type of instance this token's registration resolves to

// add queues and redis connection here later...

// Repository tokens
export const CART_REPOSITORY = Symbol("cartRepository") as symbol & {
  __type: CartRepository;
};

export const CATEGORY_REPOSITORY = Symbol("categoryRepository") as symbol & {
  __type: CategoryRepository;
};

export const ORDER_REPOSITORY = Symbol("orderRepository") as symbol & {
  __type: OrderRepository;
};

export const PRODUCT_REPOSITORY = Symbol("productRepository") as symbol & {
  __type: ProductRepository;
};

export const RATING_REPOSITORY = Symbol("ratingRepository") as symbol & {
  __type: RatingRepository;
};

export const USER_REPOSITORY = Symbol("userRepository") as symbol & {
  __type: UserRepository;
};
