import type { CartQueries } from "#/application/read-models/cart.queries.js";
import type { CategoryQueries } from "#/application/read-models/category.queries.js";
import type { OrderQueries } from "#/application/read-models/order.queries.js";
import type { ProductQueries } from "#/application/read-models/product.queries.js";
import type { RatingQueries } from "#/application/read-models/rating.queries.js";
import type { UserQueries } from "#/application/read-models/user.queries.js";
import type { OutboxRepository } from "#/application/repositories/outbox.repository.js";
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

export const OUTBOX_REPOSITORY = Symbol("outboxRepository") as symbol & {
  __type: OutboxRepository;
};

// read model tokens

export const CART_QUERIES = Symbol("cartQueries") as symbol & {
  __type: CartQueries;
};

export const CATEGORY_QUERIES = Symbol("categoryQueries") as symbol & {
  __type: CategoryQueries;
};

export const ORDER_QUERIES = Symbol("orderQueries") as symbol & {
  __type: OrderQueries;
};

export const PRODUCT_QUERIES = Symbol("productQueries") as symbol & {
  __type: ProductQueries;
};

export const RATING_QUERIES = Symbol("ratingQueries") as symbol & {
  __type: RatingQueries;
};

export const USER_QUERIES = Symbol("userQueries") as symbol & {
  __type: UserQueries;
};
