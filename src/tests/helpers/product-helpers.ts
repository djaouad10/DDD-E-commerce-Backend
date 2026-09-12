import type { Container } from "#/composition/utils/container.js";
import { PRODUCT_REPOSITORY } from "#/composition/utils/tokens.js";
import { Category } from "#/domain/entities/category.js";
import type { Variation } from "#/domain/entities/variation.js";
import { createCategoryInDB, createProductInDB } from "./db-helpers.js";
import { productFactory } from "./domain-helpers.js";
import type { File } from "#/domain/entities/file.js";

export async function setupProductAndCategory(
  container: Container,
  overrides?: Partial<{
    variations: Variation[];
    images: File[];
    category: Category;
    price: number;
    discountPrice: number;
  }>,
) {
  const category = overrides?.category || Category.create("Category");
  const product = productFactory({
    categoryId: category.id,
    ...(overrides?.variations && { customVariations: overrides.variations }),
    ...(overrides?.images && { customImages: overrides.images }),
    ...(overrides?.price && { price: overrides.price }),
    ...(overrides?.discountPrice && { discountPrice: overrides.discountPrice }),
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
