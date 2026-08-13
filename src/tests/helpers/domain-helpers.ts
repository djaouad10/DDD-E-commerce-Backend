import { Color, Product, Size } from "#/domain/entities/product.js";
import { faker } from "@faker-js/faker";
import { Slug } from "#/domain/value-objects/slug.js";
import { CategoryId } from "#/domain/value-objects/category-id.js";
import { File } from "#/domain/entities/file.js";
import { Variation } from "#/domain/entities/variation.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { Money } from "#/domain/value-objects/money.js";

export function productFactory({
  categoryId,
  customImages,
  customVariations,
  discountPrice,
  price,
}: {
  categoryId: CategoryId;
  customImages?: File[];
  customVariations?: Variation[];
  price?: number;
  discountPrice?: number;
}): Product {
  const productName = faker.commerce.productName();
  const images = [
    File.create(
      faker.string.uuid(),
      faker.system.fileName(),
      faker.image.url(),
      true,
    ),
    File.create(
      faker.string.uuid(),
      faker.system.fileName(),
      faker.image.url(),
      false,
    ),
  ];

  const variations = [
    Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
    Variation.create(Size.L, Color.BLUE, 100, 50, Weight.of(100, "g")),
    Variation.create(Size.XL, Color.GREEN, 100, 50, Weight.of(100, "g")),
  ];

  return Product.create(
    productName,
    Slug.generate(productName),
    categoryId,
    customImages ?? images,
    customVariations ?? variations,
    faker.commerce.productDescription(),
    faker.commerce.productAdjective(),
    faker.commerce.productMaterial(),
    Money.of(price ?? 2000, "DZD"),
    Money.of(discountPrice ?? 1500, "DZD"),
    null,
  );
}
