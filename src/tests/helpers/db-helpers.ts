import type { Container } from "#/composition/container.js";
import {
  CART_REPOSITORY,
  CATEGORY_REPOSITORY,
  DB,
  IDEMPOTENCY_KEYS_REPOSITORY,
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
  RATING_REPOSITORY,
} from "#/composition/tokens.js";
import type { Cart } from "#/domain/entities/cart.js";
import { Category } from "#/domain/entities/category.js";
import type { Order } from "#/domain/entities/order.js";
import { Color, Size, type Product } from "#/domain/entities/product.js";
import type { Rating } from "#/domain/entities/rating.js";
import type { User } from "#/domain/entities/user.js";
import { Variation } from "#/domain/entities/variation.js";
import { user } from "#/infrastructure/databases/schema.js";

import { sql } from "drizzle-orm";
import { orderFactory, productFactory } from "./domain-helpers.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { Money } from "#/domain/value-objects/money.js";
import { randomUUID } from "crypto";

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

export async function saveOrderInDB(container: Container, order: Order) {
  const db = container.resolveSingleton(DB);
  const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);

  await db.transaction(async (tx) => {
    await orderRepository.save(order, tx);
  });
}

export async function setupOrderInDB(
  container: Container,
  {
    owner,
    order,
    product,
    variations,
  }: {
    owner: User;
    order?: Order;
    product?: Product;
    variations?: Variation[];
  },
): Promise<Order> {
  const db = container.resolveSingleton(DB);
  const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
  const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
  const categoryRepository = container.resolveSingleton(CATEGORY_REPOSITORY);

  const category = Category.create(`Category${randomUUID().slice(0, 6)}`);

  const defaultVariations = [
    Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
    Variation.create(Size.L, Color.BLUE, 100, 50, Weight.of(100, "g")),
    Variation.create(Size.XL, Color.GREEN, 100, 50, Weight.of(100, "g")),
  ];

  const defaultProduct = productFactory({
    categoryId: category.id,
    ...(variations
      ? { customVariations: variations }
      : { customVariations: defaultVariations }),
  });

  const defaultOrderItems = [
    OrderItem.create(
      defaultVariations[0]!.id,
      3,
      Money.of(3000, "DZD"),
      Weight.of(100, "g"),
      null,
    ),
    OrderItem.create(
      defaultVariations[1]!.id,
      2,
      Money.of(2000, "DZD"),
      Weight.of(200, "g"),
      null,
    ),
  ];
  const defaultOrder = orderFactory({
    orderItems: defaultOrderItems,
    userId: owner.id,
  });

  await db.transaction(async (tx) => {
    await categoryRepository.save(category, tx);
    await productRepository.save(product ?? defaultProduct, tx);
    await orderRepository.save(order ?? defaultOrder, tx);
  });

  return order ?? defaultOrder;
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

export async function findIdempotencyKeyInDB(
  container: Container,
  key: string,
) {
  const db = container.resolveSingleton(DB);
  const idempotencyKeysRepository = container.resolveSingleton(
    IDEMPOTENCY_KEYS_REPOSITORY,
  );

  return await db.transaction(async (tx) => {
    return await idempotencyKeysRepository.find(key, tx);
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
