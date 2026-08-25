import { Color, Product, Size } from "#/domain/entities/product.js";
import { faker } from "@faker-js/faker";
import { Slug } from "#/domain/value-objects/slug.js";
import { CategoryId } from "#/domain/value-objects/category-id.js";
import { File } from "#/domain/entities/file.js";
import { Variation } from "#/domain/entities/variation.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { Money } from "#/domain/value-objects/money.js";
import { ShippingDetails } from "#/domain/value-objects/shipping-details.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { ShippingProvider, Order } from "#/domain/entities/order.js";
import { UserId } from "#/domain/value-objects/user-id.js";

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

const makeValidShippingDetails = (): ShippingDetails => {
  const validAlgerianPhoneNumber = "0678876545";

  return ShippingDetails.create(
    "TO_DESK",
    faker.person.fullName(),
    validAlgerianPhoneNumber,
    faker.number.int({ min: 1, max: 69 }),
    faker.location.city(),
    faker.location.zipCode("#####"),
    faker.location.streetAddress(),
    true,
    validAlgerianPhoneNumber,
    faker.internet.url(),
    faker.lorem.paragraphs(),
  );
};

const makeValidOrderItems = (): OrderItem[] => {
  return [
    OrderItem.create(
      VariationId.generate(),
      faker.number.int({ min: 1, max: 50 }),
      Money.of(3000, "DZD"),
      Weight.of(100, "g"),
      Money.of(2900, "DZD"),
    ),
    OrderItem.create(
      VariationId.generate(),
      faker.number.int({ min: 1, max: 50 }),
      Money.of(2000, "DZD"),
      Weight.of(200, "g"),
      null,
    ),
  ];
};

export const orderFactory = ({
  shippingDetails,
  orderItems,
  shippingPriceAtOrderTime,
  userId,
}: {
  shippingDetails?: ShippingDetails;
  orderItems?: OrderItem[];
  userId?: UserId;
  shippingPriceAtOrderTime?: Money;
}): Order => {
  return Order.create(
    userId ?? UserId.generate(),
    shippingDetails ?? makeValidShippingDetails(),
    orderItems ?? makeValidOrderItems(),
    shippingPriceAtOrderTime ?? Money.of(400, "DZD"),
    ShippingProvider.WORLD_EXPRESS,
  );
};
