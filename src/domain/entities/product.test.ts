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
import { VariationId } from "../value-objects/variation-id.js";
import { FileId } from "../value-objects/file-id.js";

// What to test:
// DONE 1. create()
// DONE 2. reconstitute()
// DONE 3. updateName()
// DONE 4. updatePrice
// DONE 5. updateDiscountedPrice
// DONE 6. addVariation
// DONE 7. removeVariation
// DONE 8. addImage
// DONE 9. updateMainImage
// DONE 10. removeImage
// DONE 11. isInStock
// DONE 12. getDisplayPrice
// DONE 13. hasDiscount
// DONE 14. getDiscountAmount
// DONE 15. calculateDiscountPercentage
// DONE 16. reserveStock
// 17. releaseStock

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

    test("when a product is created with a discounted price with an amount greater than the price, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidCreateArguments();
      // set price
      args[8] = Money.of(1000, "DZD");

      // set discounted price
      args[9] = Money.of(2000, "DZD");

      // Act & Assert
      expect(() => Product.create(...args)).toThrow(ValidationError);
    });

    test("when a product is created with a discounted price with a currency different than the price, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidCreateArguments();
      // set price
      args[8] = Money.of(1000, "DZD");

      // set discounted price
      // @ts-expect-error: I don't use USD, just to test the error
      args[9] = Money.of(2000, "USD");

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

    test("when a product is reconstituted with a discounted price with an amount greater than the price, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set price
      args[9] = Money.of(1000, "DZD");

      // set discounted price
      args[10] = Money.of(2000, "DZD");

      // Act & Assert
      expect(() => Product.reconstitute(...args)).toThrow(ValidationError);
    });

    test("when a product is reconstituted with a discounted price with a currency different than the price, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set price
      args[9] = Money.of(1000, "DZD");

      // set discounted price
      // @ts-expect-error: I don't use USD, just to test the error
      args[10] = Money.of(2000, "USD");

      // Act & Assert
      expect(() => Product.reconstitute(...args)).toThrow(ValidationError);
    });
  });

  describe("Product.updateName()", () => {
    test("when called with a valid name, it should update the name", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old name
      args[1] = "old name";

      const product = Product.reconstitute(...args);

      const newName = "new name";

      // Act
      product.updateName(newName);

      // Assert
      expect(product.getName()).toBe(newName);
    });

    test("when called with a valid name, it should update the slug", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old name
      args[1] = "old name";

      const product = Product.reconstitute(...args);

      // save old slug value
      const oldSlug = product.getSlug();

      const newName = "new name";

      // Act
      product.updateName(newName);

      // Assert
      expect(product.getSlug().value).not.toEqual(oldSlug.value);
    });

    test("when called with an invalid name, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old name
      args[1] = "old name";

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(() => product.updateName("")).toThrow(ValidationError);
    });
  });

  describe("Product.updatePrice()", () => {
    test("when called with a valid price, it should update the price", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old price and discounted price
      args[9] = Money.of(1200, "DZD");
      args[10] = Money.of(1000, "DZD");

      const product = Product.reconstitute(...args);

      const newPrice = Money.of(2000, "DZD");

      // Act
      product.updatePrice(newPrice);

      // Assert
      expect(product.getPrice()).toStrictEqual(newPrice);
    });

    test("when called with a price of different currency, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old price and discounted price
      args[9] = Money.of(1200, "DZD");
      args[10] = Money.of(1000, "DZD");

      const product = Product.reconstitute(...args);

      // @ts-expect-error: I don't use USD, just to test the error
      const newPrice = Money.of(2000, "USD");

      // Act & Assert
      expect(() => product.updatePrice(newPrice)).toThrow(ValidationError);
    });

    test("when called with a price less than or equal to the discounted price, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old price and discounted price
      args[9] = Money.of(1200, "DZD");
      args[10] = Money.of(1000, "DZD");

      const product = Product.reconstitute(...args);

      const newPrice = Money.of(1000, "DZD");

      // Act & Assert
      expect(() => product.updatePrice(newPrice)).toThrow(ValidationError);
    });
  });

  describe("Product.updateDiscountedPrice()", () => {
    test("when called with a valid discounted price, it should update the discounted price", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old price
      args[9] = Money.of(3000, "DZD");
      // and discounted price
      args[10] = Money.of(2000, "DZD");

      const product = Product.reconstitute(...args);

      const newDiscountedPrice = Money.of(1500, "DZD");

      // Act
      product.updateDiscountedPrice(newDiscountedPrice);

      // Assert
      expect(product.getDiscountedPrice()).toStrictEqual(newDiscountedPrice);
    });

    test("when called with a discounted price of different currency, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old price
      args[9] = Money.of(3000, "DZD");
      // and discounted price
      args[10] = Money.of(2000, "DZD");

      const product = Product.reconstitute(...args);

      // @ts-expect-error: I don't use USD, just to test the error
      const newDiscountedPrice = Money.of(1500, "USD");

      // Act & Assert
      expect(() => product.updateDiscountedPrice(newDiscountedPrice)).toThrow(
        ValidationError,
      );
    });

    test("when called with a discounted price greater than the price, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old price
      args[9] = Money.of(3000, "DZD");
      // and discounted price
      args[10] = Money.of(2000, "DZD");

      const product = Product.reconstitute(...args);

      const newDiscountedPrice = Money.of(4000, "DZD");

      // Act & Assert
      expect(() => product.updateDiscountedPrice(newDiscountedPrice)).toThrow(
        ValidationError,
      );
    });

    test("when called with a discounted price equal to the price, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set old price
      args[9] = Money.of(3000, "DZD");
      // and discounted price
      args[10] = Money.of(2900, "DZD");

      const product = Product.reconstitute(...args);

      const newDiscountedPrice = Money.of(3000, "DZD");

      // Act & Assert
      expect(() => product.updateDiscountedPrice(newDiscountedPrice)).toThrow(
        ValidationError,
      );
    });
  });

  describe("Product.addVariation()", () => {
    test("when called with a new variation, it should add it to the variations", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      // set existing variations
      const variations = [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.M, Color.BLUE, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.S, Color.GREEN, 100, 50, Weight.of(100, "g")),
      ];

      args[5] = variations;

      const product = Product.reconstitute(...args);

      const newVariation = Variation.create(
        Size.XL,
        Color.RED,
        100,
        50,
        Weight.of(100, "g"),
      );

      // Act
      product.addVariation(newVariation);

      // Assert
      expect(product.getVariations()).toContainEqual(newVariation);
    });

    test("when called with a variation with existing color and size, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      // set existing variations
      const variations = [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.M, Color.BLUE, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.S, Color.GREEN, 100, 50, Weight.of(100, "g")),
      ];

      args[5] = variations;

      const product = Product.reconstitute(...args);

      const newVariation = Variation.create(
        Size.M,
        Color.RED,
        100,
        50,
        Weight.of(100, "g"),
      );

      // Act & Assert
      expect(() => product.addVariation(newVariation)).toThrow(ValidationError);
    });
  });

  describe("Product.removeVariation()", () => {
    test("when called with a variation id, it should remove it from the variations", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      // set existing variations
      const variations = [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.M, Color.BLUE, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.S, Color.GREEN, 100, 50, Weight.of(100, "g")),
      ];

      args[5] = variations;

      const product = Product.reconstitute(...args);

      // Act
      product.removeVariation(variations[1]!.id);

      // Assert
      expect(product.getVariations()).not.toContainEqual(variations[1]);
    });

    test("when called with a non existing variation id, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      // set existing variations
      const variations = [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.M, Color.BLUE, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.S, Color.GREEN, 100, 50, Weight.of(100, "g")),
      ];

      args[5] = variations;

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(() => product.removeVariation(VariationId.generate())).toThrow(
        ValidationError,
      );
    });
  });

  describe("Product.addImage()", () => {
    test("when called with a new image, it should add it to the images", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      const product = Product.reconstitute(...args);

      const newImage = File.create(
        faker.string.uuid(),
        faker.system.fileName(),
        faker.image.url(),
        false,
      );

      // Act
      product.addImage(newImage);

      // Assert
      expect(product.getImages()).toContainEqual(newImage);
    });

    test("when called with an image that has isMain set to true,  it should set it to false and add the image to the images", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      const product = Product.reconstitute(...args);

      const newImage = File.create(
        faker.string.uuid(),
        faker.system.fileName(),
        faker.image.url(),
        true,
      );

      // Act
      product.addImage(newImage);

      const myAddedImage = product
        .getImages()
        .find((i) => i.id.equals(newImage.id));

      // Assert
      expect(myAddedImage!.isMain()).toBe(false);
    });
  });

  describe("Product.updateMainImage()", () => {
    test("when called with a new main image, it should add it to the images", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      const product = Product.reconstitute(...args);

      const newMainImage = File.create(
        faker.string.uuid(),
        faker.system.fileName(),
        faker.image.url(),
        true,
      );

      // Act
      product.updateMainImage(newMainImage);

      // Assert
      expect(product.getImages()).toContainEqual(newMainImage);
    });

    test("when called with a new main image, it should delete the old main image", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      // set old images
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
        File.create(
          faker.string.uuid(),
          faker.system.fileName(),
          faker.image.url(),
          false,
        ),
      ];

      args[4] = images;

      const product = Product.reconstitute(...args);

      const newMainImage = File.create(
        faker.string.uuid(),
        faker.system.fileName(),
        faker.image.url(),
        true,
      );

      // Act
      product.updateMainImage(newMainImage);

      // Assert
      expect(product.getImages()).not.toContainEqual(images[0]);
    });

    test("when called with a new main image, there should be only one main image", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      // set old images
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
        File.create(
          faker.string.uuid(),
          faker.system.fileName(),
          faker.image.url(),
          false,
        ),
      ];

      args[4] = images;

      const product = Product.reconstitute(...args);

      const newMainImage = File.create(
        faker.string.uuid(),
        faker.system.fileName(),
        faker.image.url(),
        true,
      );

      // Act
      product.updateMainImage(newMainImage);

      // Assert
      expect(product.getImages().filter((i) => i.isMain())).toHaveLength(1);
    });
  });

  describe("Product.removeImage()", () => {
    test("when called with a valid image id, it should remove the image from the images", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      // set old images
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
        File.create(
          faker.string.uuid(),
          faker.system.fileName(),
          faker.image.url(),
          false,
        ),
      ];
      args[4] = images;

      const product = Product.reconstitute(...args);

      // use an id of a non-main image
      const imageId = images[1]!.id;

      // Act
      product.removeImage(imageId);

      // Assert
      expect(product.getImages()).not.toContainEqual(images[1]);
    });

    test("when call with a non-existing image id, it should throw an error", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(() => product.removeImage(FileId.generate())).toThrow(
        ValidationError,
      );
    });

    test("when called with a main image id, it should throw an error", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      // set old images
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
        File.create(
          faker.string.uuid(),
          faker.system.fileName(),
          faker.image.url(),
          false,
        ),
      ];
      args[4] = images;

      const product = Product.reconstitute(...args);

      // use an id of a main image
      const imageId = images[0]!.id;

      // Act & Assert
      expect(() => product.removeImage(imageId)).toThrowError(ValidationError);
    });
  });

  describe("Product.isInStock()", () => {
    test("if at least one variation is in stock, it should return true", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // old variations
      const variations = [
        Variation.create(Size.M, Color.RED, 50, 50, Weight.of(100, "g")), // out of stock
        Variation.create(Size.M, Color.BLUE, 50, 50, Weight.of(100, "g")), // out of stock
        Variation.create(Size.M, Color.GREEN, 60, 50, Weight.of(100, "g")), // in stock
      ];

      args[5] = variations;

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.isInStock()).toBe(true);
    });

    test("if all variations are out of stock, it should return false", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // old variations
      const variations = [
        Variation.create(Size.M, Color.RED, 50, 50, Weight.of(100, "g")), // out of stock
        Variation.create(Size.M, Color.BLUE, 50, 50, Weight.of(100, "g")), // out of stock
        Variation.create(Size.M, Color.GREEN, 50, 50, Weight.of(100, "g")), // out of stock
      ];

      args[5] = variations;

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.isInStock()).toBe(false);
    });
  });

  describe("Product.getDisplayPrice()", () => {
    test("if the product has no discount, it should return the price", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[10] = null;

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.getDisplayPrice()).toEqual(args[9]);
    });

    test("if the product has a discount, it should return the discounted price", () => {
      // Arrange
      const args = makeValidReconstituteArguments();

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.getDisplayPrice()).toEqual(args[10]);
    });
  });

  describe("Product.hasDiscount()", () => {
    test("if the product has no discount, it should return false", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[10] = null;

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.hasDiscount()).toBe(false);
    });

    test("if the product has a discount, it should return true", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set price and discount
      args[9] = Money.of(2000, "DZD");
      args[10] = Money.of(1000, "DZD");

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.hasDiscount()).toBe(true);
    });
  });

  describe("Product.getDiscountAmount()", () => {
    test("if the product has no discount, it should return Money of 0 with the same currency", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[10] = null;

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.getDiscountAmount()).toEqual(
        Money.of(0, args[9].currency),
      );
    });

    test("if the product has a discount, it should return the discount amount in the same currency", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set price and discount
      args[9] = Money.of(2000, "DZD");
      args[10] = Money.of(1000, "DZD");

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.getDiscountAmount()).toEqual(Money.of(1000, "DZD"));
    });
  });

  describe("Product.getDiscountPercentage()", () => {
    test("if the product has no discount, it should return 0", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      args[10] = null;

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.calculateDiscountPercentage()).toBe(0);
    });

    test("if the product has a discount, it should return the discount percentage rounded to the nearest integer", () => {
      // Arrange
      const args = makeValidReconstituteArguments();
      // set price and discount
      args[9] = Money.of(2000, "DZD");
      args[10] = Money.of(1500, "DZD");

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(product.calculateDiscountPercentage()).toBe(25);
    });
  });

  describe("Product.reserveStock()", () => {
    test("when called with valid arguments, it should reserve stock for the specified variation", () => {
      // Arrange
      const variations = [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.EU_37, Color.BEIGE, 100, 50, Weight.of(100, "g")),
      ];

      const args = makeValidReconstituteArguments();
      args[5] = variations;

      const product = Product.reconstitute(...args);

      // Act
      product.reserveStock(variations[0]!.id, 10);

      // Assert
      const tragetVariation = variations.find((v) =>
        v.id.equals(variations[0]!.id),
      );

      expect(tragetVariation!.getReservedQty()).toBe(60);
    });

    test("when reserving a non-existent variation, it should throw a ValidationError", () => {
      // Arrange
      const variations = [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.EU_37, Color.BEIGE, 100, 50, Weight.of(100, "g")),
      ];

      const args = makeValidReconstituteArguments();
      args[5] = variations;

      const product = Product.reconstitute(...args);

      // Act & Assert
      expect(() => product.reserveStock(VariationId.generate(), 10)).toThrow(
        ValidationError,
      );
    });
  });
});
