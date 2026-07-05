import { ValidationError } from "#/shared/errors/domain-error.js";
import { ProductId } from "../value-objects/product-id.js";
import { VariationId } from "../value-objects/variation-id.js";
import { Weight } from "../value-objects/weight.js";
import { Color, Size } from "./product.js";
import { Variation } from "./variation.js";

// what to test:
// 1. create
// 2. reconstitute
// 3. updateTotalQty
// 4. updateTotalQty

describe("Variation Entity", () => {
  const makeValidVariationCreateArgs = (): Parameters<
    typeof Variation.create
  > => {
    return [
      ProductId.generate(),
      Size.M,
      Color.RED,
      100,
      50,
      Weight.of(100, "g"),
    ];
  };

  const makeValidVariationReconstituteArgs = (): Parameters<
    typeof Variation.reconstitute
  > => {
    return [
      VariationId.generate(),
      ProductId.generate(),
      Size.M,
      Color.RED,
      100,
      50,
      Weight.of(100, "g"),
      new Date(),
      new Date(),
    ];
  };

  describe("Variation.create()", () => {
    test("when called with valid arguments, it should return a Variation instance", () => {
      // Arrange
      const args = makeValidVariationCreateArgs();

      // Act
      const variation = Variation.create(...args);

      // Assert
      expect(variation).toBeInstanceOf(Variation);
    });

    test("when called with a non-gram weight, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationCreateArgs();
      args[5] = Weight.of(100, "kg");

      // Act & Assert
      expect(() => Variation.create(...args)).toThrow(ValidationError);
    });

    test("when called with valid arguments, it should calculate the available quantity", () => {
      // Arrange
      const args = makeValidVariationCreateArgs();
      // set total qty
      args[3] = 100;
      // set reserved qty
      args[4] = 40;

      // Act
      const variation = Variation.create(...args);

      // Assert
      expect(variation.getAvailableQty()).toBe(60);
    });

    test("when called with valid arguments, it should set isInStock to true if available quantity is greater than 0", () => {
      // Arrange
      const args = makeValidVariationCreateArgs();
      // set total qty
      args[3] = 100;
      // set reserved qty
      args[4] = 40;

      // Act
      const variation = Variation.create(...args);

      // Assert
      expect(variation.isInStock()).toBe(true);
    });

    test("when called with valid arguments, it should set isInStock to false if available quantity is 0", () => {
      // Arrange
      const args = makeValidVariationCreateArgs();
      // set total qty
      args[3] = 100;
      // set reserved qty
      args[4] = 100;

      // Act
      const variation = Variation.create(...args);

      // Assert
      expect(variation.isInStock()).toBe(false);
    });
  });

  describe("Variation.reconstitute()", () => {
    test("when called with valid arguments, it should return a Variation instance", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();

      // Act
      const variation = Variation.reconstitute(...args);

      // Assert
      expect(variation).toBeInstanceOf(Variation);
    });

    test("when called with a non-gram weight, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      args[6] = Weight.of(100, "kg");

      // Act & Assert
      expect(() => Variation.reconstitute(...args)).toThrow(ValidationError);
    });

    test("when called with valid arguments, it should calculate the available quantity", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total qty
      args[4] = 100;
      // set reserved qty
      args[5] = 40;

      // Act
      const variation = Variation.reconstitute(...args);

      // Assert
      expect(variation.getAvailableQty()).toBe(60);
    });

    test("when called with valid arguments, it should set isInStock to true if available quantity is greater than 0", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total qty
      args[4] = 100;
      // set reserved qty
      args[5] = 40;

      // Act
      const variation = Variation.reconstitute(...args);

      // Assert
      expect(variation.isInStock()).toBe(true);
    });

    test("when called with valid arguments, it should set isInStock to false if available quantity is 0", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total qty
      args[4] = 100;
      // set reserved qty
      args[5] = 100;

      // Act
      const variation = Variation.reconstitute(...args);

      // Assert
      expect(variation.isInStock()).toBe(false);
    });
  });
});
