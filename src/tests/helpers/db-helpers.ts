import type { Container } from "#/composition/container.js";
import { CATEGORY_REPOSITORY, DB } from "#/composition/tokens.js";
import type { Category } from "#/domain/entities/category.js";

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
