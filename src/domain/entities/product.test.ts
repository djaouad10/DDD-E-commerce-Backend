import { faker } from "@faker-js/faker";
import { Color, Product, Size } from "./product.js";
import { Slug } from "../value-objects/slug.js";
import { CategoryId } from "../value-objects/category-id.js";
import { File } from "./file.js";
import { Variation } from "./variation.js";
import { Weight } from "../value-objects/weight.js";
import { Money } from "../value-objects/money.js";
import { ProductId } from "../value-objects/product-id.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

// What to test:
// DONE 1. create()
// 2. reconstitute()
// 3. updateName()
// 4. updatePrice
// 5. updateDiscountedPrice
// 6. addVariation
// 7. removeVariation
// 8. addImage
// 9. updateMainImage
// 10. removeImage
// 11. isInStock
// 12. getDisplayPrice
// 13. hasDiscount
// 14. getDiscountAmount
// 15. calculateDiscountPercentage

describe("Product", () => {
  const productName = faker.commerce.productName();
  let images: File[];

  let variations: Variation[];

  beforeEach(() => {
    images = [
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
      File.create(
        faker.string.uuid(),
        faker.system.fileName(),
        faker.image.url(),
        false,
      ),
    ];

    variations = [
      Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
      Variation.create(Size.L, Color.BLUE, 100, 50, Weight.of(100, "g")),
      Variation.create(Size.XL, Color.GREEN, 100, 50, Weight.of(100, "g")),
    ];
  });

  const makeValidCreateArguments = (): Parameters<typeof Product.create> => {
    return [
      productName,
      Slug.generate(productName),
      CategoryId.generate(),
      images,
      variations,
      faker.commerce.productDescription(),
      faker.commerce.productAdjective(),
      faker.commerce.productMaterial(),
      Money.of(2000, "DZD"),
      Money.of(1500, "DZD"),
      null,
    ];
  };

  const makeValidReconstituteArguments = (): Parameters<
    typeof Product.reconstitute
  > => {
    return [
      ProductId.generate(),
      productName,
      Slug.generate(productName),
      CategoryId.generate(),
      images,
      variations,
      faker.commerce.productDescription(),
      faker.commerce.productAdjective(),
      faker.commerce.productMaterial(),
      Money.of(2000, "DZD"),
      Money.of(1500, "DZD"),
      null,
      new Date(),
      new Date(),
    ];
  };

  describe("Product.create()", () => {
    test("when called with valid arguments, it should return a Product instance with a generated id", () => {
      // Arrange & Act
      const product = Product.create(...makeValidCreateArguments());

      // Assert
      expect(product).toBeInstanceOf(Product);
      expect(product.id).toBeInstanceOf(ProductId);
    });

    test("when a product is created with no images, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidCreateArguments();
      args[3] = [];

      // Act & Assert
      expect(() => Product.create(...args)).toThrow(ValidationError);
    });

    test("when a product is created with no main image, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidCreateArguments();
      args[3].forEach((i) => i.setIsMain(false));

      // Act & Assert
      expect(() => Product.create(...args)).toThrow(ValidationError);
    });

    test("when a product is created with no variations, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidCreateArguments();
      args[4] = [];

      // Act & Assert
      expect(() => Product.create(...args)).toThrow(ValidationError);
    });

    test("when a product is created with more than one main image, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidCreateArguments();
      args[3].forEach((i) => i.setIsMain(true));

      // Act & Assert
      expect(() => Product.create(...args)).toThrow(ValidationError);
    });

    test("when a product is created with an average rating and it's less than 0, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidCreateArguments();
      args[10] = -1;

      // Act & Assert
      expect(() => Product.create(...args)).toThrow(ValidationError);
    });

    test("when a product is created with an average rating and it's more than 5, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidCreateArguments();
      args[10] = 6;

      // Act & Assert
      expect(() => Product.create(...args)).toThrow(ValidationError);
    });
  });

  describe("Product.reconstitute()", () => {
    test("when called with valid arguments, it should return a Product instance using the provided id", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      const productId = args[0];

      // Act
      const product = Product.reconstitute(...args);

      // Assert
      expect(product).toBeInstanceOf(Product);
      expect(product.id).toStrictEqual(productId);
    });

    test("when a product is reconstituted with no images, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[4] = [];

      // Act & Assert
      expect(() => Product.reconstitute(...args)).toThrow(ValidationError);
    });

    test("when a product is reconstituted with no main image, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[4].forEach((i) => i.setIsMain(false));

      // Act & Assert
      expect(() => Product.reconstitute(...args)).toThrow(ValidationError);
    });

    test("when a product is reconstituted with more than one main image, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[4].forEach((i) => i.setIsMain(true));

      // Act & Assert
      expect(() => Product.reconstitute(...args)).toThrow(ValidationError);
    });

    test("when a product is reconstituted with an average rating and it's less than 0, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[11] = -1;

      // Act & Assert
      expect(() => Product.reconstitute(...args)).toThrow(ValidationError);
    });

    test("when a product is reconstituted with an average rating and it's more than 5, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[11] = 6;

      // Act & Assert
      expect(() => Product.reconstitute(...args)).toThrow(ValidationError);
    });

    test("when a product is reconstituted with no variations, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[5] = [];

      // Act & Assert
      expect(() => Product.reconstitute(...args)).toThrow(ValidationError);
    });
  });
});
