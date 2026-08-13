import type { Container } from "#/composition/container.js";
import {
  CART_REPOSITORY,
  CATEGORY_REPOSITORY,
  DB,
  PRODUCT_REPOSITORY,
  RATING_REPOSITORY,
} from "#/composition/tokens.js";
import type { Cart } from "#/domain/entities/cart.js";
import type { Category } from "#/domain/entities/category.js";
import type { Product } from "#/domain/entities/product.js";
import type { Rating } from "#/domain/entities/rating.js";
import type { User } from "#/domain/entities/user.js";
import { user } from "#/infrastructure/databases/schema.js";

import { sql } from "drizzle-orm";

export async function createCategoryInDB(
  container: Container,
  category: Category,
): Promise<void> {
  const db = container.resolveSingleton(DB);
  const categoryRepository = container.resolveSingleton(CATEGORY_REPOSITORY);

  await db.transaction(async (tx) => {
    await categoryRepository.save(category, tx);
  });
}

export async function saveCartInDB(
  container: Container,
  cart: Cart,
): Promise<void> {
  const db = container.resolveSingleton(DB);
  const cartRepository = container.resolveSingleton(CART_REPOSITORY);

  await db.transaction(async (tx) => {
    await cartRepository.save(cart, tx);
  });
}

export async function createUserInDB(
  container: Container,
  userObj: User,
  createdAt?: Date,
) {
  const db = container.resolveSingleton(DB);
  await db.insert(user).values({
    id: userObj.id.value,
    email: userObj.email,
    name: userObj.getName(),
    role: userObj.role,
    emailVerified: true,
    image: userObj.getImage(),
    createdAt: createdAt ?? userObj.createdAt,
    updatedAt: userObj.getUpdatedAt(),
    banned: userObj.isBanned(),
  });
}

export async function createProductInDB(
  container: Container,
  product: Product,
) {
  const db = container.resolveSingleton(DB);
  const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);

  await db.transaction(async (tx) => {
    await productRepository.save(product, tx);
  });
}

export async function createRatingInDB(container: Container, rating: Rating) {
  const db = container.resolveSingleton(DB);
  const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);

  await db.transaction(async (tx) => {
    await ratingRepository.save(rating, tx);
  });
}

export async function clearDatabase(container: Container): Promise<void> {
  const db = container.resolveSingleton(DB);

  await db.execute(sql`
  TRUNCATE TABLE
    order_item,
    cart_item,
    rating,
    file,
    variation,
    "order",
    product,
    category,
    outbox,
    idempotency_keys,
    verification,
    session,
    account,
    "user"
  RESTART IDENTITY CASCADE;
`);
}
