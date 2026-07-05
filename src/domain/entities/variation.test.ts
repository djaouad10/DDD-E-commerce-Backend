import { ValidationError } from "#/shared/errors/domain-error.js";
import { VariationId } from "../value-objects/variation-id.js";
import { Weight } from "../value-objects/weight.js";
import { Color, Size } from "./product.js";
import { Variation } from "./variation.js";

// what to test:
// DONE 1. create
// DONE 2. reconstitute
// DONE 3. updateTotalQty
// 4. updateWeight

describe("Variation Entity", () => {
  const makeValidVariationCreateArgs = (): Parameters<
    typeof Variation.create
  > => {
    return [Size.M, Color.RED, 100, 50, Weight.of(100, "g")];
  };

  const makeValidVariationReconstituteArgs = (): Parameters<
    typeof Variation.reconstitute
  > => {
    return [
      VariationId.generate(),
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
      args[4] = Weight.of(100, "kg");

      // Act & Assert
      expect(() => Variation.create(...args)).toThrow(ValidationError);
    });

    test("when called with valid arguments, it should calculate the available quantity", () => {
      // Arrange
      const args = makeValidVariationCreateArgs();
      // set total qty
      args[2] = 100;
      // set reserved qty
      args[3] = 40;

      // Act
      const variation = Variation.create(...args);

      // Assert
      expect(variation.getAvailableQty()).toBe(60);
    });

    test("when called with valid arguments, it should set isInStock to true if available quantity is greater than 0", () => {
      // Arrange
      const args = makeValidVariationCreateArgs();
      // set total qty
      args[2] = 100;
      // set reserved qty
      args[3] = 40;

      // Act
      const variation = Variation.create(...args);

      // Assert
      expect(variation.isInStock()).toBe(true);
    });

    test("when called with valid arguments, it should set isInStock to false if available quantity is 0", () => {
      // Arrange
      const args = makeValidVariationCreateArgs();
      // set total qty
      args[2] = 100;
      // set reserved qty
      args[3] = 100;

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
      args[5] = Weight.of(100, "kg");

      // Act & Assert
      expect(() => Variation.reconstitute(...args)).toThrow(ValidationError);
    });

    test("when called with valid arguments, it should calculate the available quantity", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total qty
      args[3] = 100;
      // set reserved qty
      args[4] = 40;

      // Act
      const variation = Variation.reconstitute(...args);

      // Assert
      expect(variation.getAvailableQty()).toBe(60);
    });

    test("when called with valid arguments, it should set isInStock to true if available quantity is greater than 0", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total qty
      args[3] = 100;
      // set reserved qty
      args[4] = 40;

      // Act
      const variation = Variation.reconstitute(...args);

      // Assert
      expect(variation.isInStock()).toBe(true);
    });

    test("when called with valid arguments, it should set isInStock to false if available quantity is 0", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total qty
      args[3] = 100;
      // set reserved qty
      args[4] = 100;

      // Act
      const variation = Variation.reconstitute(...args);

      // Assert
      expect(variation.isInStock()).toBe(false);
    });
  });

  describe("Variation.updateTotalQty()", () => {
    test("when called with valid arguments, it should update the total quantity", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set current total qty
      args[4] = 100;
      const variation = Variation.reconstitute(...args);

      // Act
      variation.updateTotalQty(200);

      // Assert
      expect(variation.getTotalQty()).toBe(200);
    });

    test("when called with valid arguments, it should update the available quantity and inStock status", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set current total qty
      args[3] = 100;
      // set current reserved qty
      args[4] = 100;

      const variation = Variation.reconstitute(...args);

      // Act
      variation.updateTotalQty(200);

      // Assert
      expect(variation.getAvailableQty()).toBe(100);
      expect(variation.isInStock()).toBe(true);
    });

    test("when called with valid arguments, it should update the updatedAt field", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set current total qty
      args[4] = 100;
      // set current reserved qty
      args[4] = 50;
      // set current updatedAt
      args[7] = new Date("2026-06-01");

      const variation = Variation.reconstitute(...args);

      const oldUpdatedAt = variation.getUpdatedAt();

      // Act
      variation.updateTotalQty(200);

      // Assert
      expect(variation.getUpdatedAt().getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });

    test("when called with negative quantity, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.updateTotalQty(-1)).toThrow(ValidationError);
    });

    test("when called with quantity less than reserved quantity, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set current total qty
      args[3] = 200;
      // set current reserved qty
      args[4] = 100;
      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.updateTotalQty(99)).toThrow(ValidationError);
    });
  });

  describe("Variation.updateWeight()", () => {
    test("when called with valid arguments, it should update the weight", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set current weight
      args[5] = Weight.of(50, "g");

      const variation = Variation.reconstitute(...args);

      // Act
      variation.updateWeight(Weight.of(100, "g"));

      // Assert
      expect(variation.getWeight()).toStrictEqual(Weight.of(100, "g"));
    });

    test("when called with valid arguments, it should update the updatedAt field", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set current weight
      args[5] = Weight.of(50, "g");
      // set current updatedAt
      args[7] = new Date("2026-06-01");

      const variation = Variation.reconstitute(...args);

      const oldUpdatedAt = variation.getUpdatedAt();

      // Act
      variation.updateWeight(Weight.of(100, "g"));

      // Assert
      expect(variation.getUpdatedAt().getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });

    test("when called with non-gram weight, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();

      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.updateWeight(Weight.of(2, "kg"))).toThrow(
        ValidationError,
      );
    });
  });
});
