import { Color, Size, type Product } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
import { productFactory, userFactory } from "./domain-helpers.js";
import { Category } from "#/domain/entities/category.js";
import { Weight } from "#/domain/value-objects/weight.js";
import {
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  saveCartInDB,
} from "./db-helpers.js";
import {
  CART_REPOSITORY,
  PRODUCT_REPOSITORY,
} from "#/composition/utils/tokens.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { VariationId } from "#/domain/value-objects/variation-id.js";
import type { Container } from "#/composition/utils/container.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import type { User } from "#/domain/entities/user.js";

export async function setupProductAndUserInDB(container: Container): Promise<{
  user: User;
  product: Product;
  variation1: Variation;
  variation2: Variation;
}> {
  const user = userFactory();
  const category = Category.create("Category");
  const product = productFactory({
    categoryId: category.id,
    customVariations: [
      Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
      Variation.create(Size.L, Color.BLUE, 100, 50, Weight.of(100, "g")),
    ],
  });

  await createCategoryInDB(container, category);
  await createProductInDB(container, product);
  await createUserInDB(container, user);

  const variation1 = product.getVariations()[0];
  const variation2 = product.getVariations()[1];

  if (!variation1 || !variation2) {
    throw new Error("Variation not found");
  }

  const productRepo = container.resolveSingleton(PRODUCT_REPOSITORY);
  const latestProduct = await productRepo.find(product.id);

  if (!latestProduct) {
    throw new Error("Product not found");
  }

  return { user, product, variation1, variation2 };
}

export async function addExistingVariationToCart(
  container: Container,
  params: {
    userId: UserId;
    variationId: VariationId;
    qty: number;
  },
) {
  const cartRepo = container.resolveSingleton(CART_REPOSITORY);

  const cart = await cartRepo.findByUserId(params.userId);

  cart.addItem(CartItem.create(params.variationId, params.qty));

  await saveCartInDB(container, cart);
}
