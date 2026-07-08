import { ValidationError } from "#/shared/errors/domain-error.js";
import { VariationId } from "../value-objects/variation-id.js";
import { Weight } from "../value-objects/weight.js";
import { Color, Size } from "./product.js";
import { Variation } from "./variation.js";

// what to test:
// DONE 1. create
// DONE 2. reconstitute
// DONE 3. updateTotalQty
// DONE 4. updateWeight
// DONE 5. reserve
// 6. release

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

  describe("Variation.reserve()", () => {
    test("when called with valid arguments, it should update the reserved quantity", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total quantity
      args[3] = 100;
      // set reserved quantity
      args[4] = 50;

      const variation = Variation.reconstitute(...args);

      // Act
      variation.reserve(20);

      // Assert
      expect(variation.getReservedQty()).toBe(70);
    });

    test("when reserving exact available quantity, it should reserve it and set isInStock to false", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total quantity
      args[3] = 100;
      // set reserved quantity
      args[4] = 50;

      const variation = Variation.reconstitute(...args);

      // Act
      variation.reserve(50);

      // Assert
      expect(variation.getReservedQty()).toBe(100);
      expect(variation.getAvailableQty()).toBe(0);
      expect(variation.isInStock()).toBe(false);
    });

    test("when reserving zero quantity, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.reserve(0)).toThrow(ValidationError);
    });

    test("when reserving a negative quantity, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.reserve(-1)).toThrow(ValidationError);
    });

    test("when reserving more than available quantity, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total quantity
      args[3] = 100;
      // set reserved quantity
      args[4] = 50;

      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.reserve(101)).toThrow(ValidationError);
    });
  });

  describe("Variation.release()", () => {
    test("when called with valid arguments, it should update the reserved quantity", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total quantity
      args[3] = 100;
      // set reserved quantity
      args[4] = 50;

      const variation = Variation.reconstitute(...args);

      // Act
      variation.release(20);

      // Assert
      expect(variation.getReservedQty()).toBe(30);
    });

    test("when releasing zero quantity, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.release(0)).toThrow(ValidationError);
    });

    test("when releasing a negative quantity, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.release(-1)).toThrow(ValidationError);
    });

    test("when releasing more than reserved quantity, it should throw a ValidationError", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total quantity
      args[3] = 100;
      // set reserved quantity
      args[4] = 50;

      const variation = Variation.reconstitute(...args);

      // Act & Assert
      expect(() => variation.release(51)).toThrow(ValidationError);
    });

    test("when reserved quantity was equal to total quantity before releasing, it should set isInStock to true", () => {
      // Arrange
      const args = makeValidVariationReconstituteArgs();
      // set total quantity
      args[3] = 100;
      // set reserved quantity
      args[4] = 100;

      const variation = Variation.reconstitute(...args);

      // Act
      variation.release(30);

      // Assert
      expect(variation.getReservedQty()).toBe(70);
      expect(variation.getAvailableQty()).toBe(30);
      expect(variation.isInStock()).toBe(true);
    });
  });
});
