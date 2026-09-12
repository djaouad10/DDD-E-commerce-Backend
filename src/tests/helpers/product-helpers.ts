import type { Container } from "#/composition/utils/container.js";
import { PRODUCT_REPOSITORY } from "#/composition/utils/tokens.js";
import { Category } from "#/domain/entities/category.js";
import type { Variation } from "#/domain/entities/variation.js";
import { createCategoryInDB, createProductInDB } from "./db-helpers.js";
import { productFactory } from "./domain-helpers.js";

export async function setupProductAndCategory(
  container: Container,
  overrides?: Partial<{
    variations: Variation[];
  }>,
) {
  const category = Category.create("Category");
  const product = productFactory({
    categoryId: category.id,
    ...(overrides?.variations && { customVariations: overrides.variations }),
  });

  await createCategoryInDB(container, category);
  await createProductInDB(container, product);

  const productRepo = container.resolveSingleton(PRODUCT_REPOSITORY);
  const latestProduct = await productRepo.find(product.id);

  if (!latestProduct) {
    throw new Error("Product not found");
  }

  return { category, product: latestProduct };
}
