// What to test:
// DONE 1. of()
// 2. add()
// 3. multiply()
// 4. toKg()

import { ValidationError } from "#/shared/errors/domain-error.js";
import { Weight } from "./weight.js";

describe("Weight Value Object", () => {
  describe("Weight.of()", () => {
    test("when weight is positive, it should return a Weight instance", () => {
      // Arrange & Act
      const weight = Weight.of(100, "g");

      // Assert
      expect(weight).toBeInstanceOf(Weight);
      expect(weight.weight).toBe(100);
      expect(weight.unit).toBe("g");
    });

    test("when weight is zero, it should return a Weight instance", () => {
      // Arrange & Act
      const weight = Weight.of(0, "g");

      // Assert
      expect(weight).toBeInstanceOf(Weight);
      expect(weight.weight).toBe(0);
      expect(weight.unit).toBe("g");
    });

    test("when weight is negative, it should throw a Validation error", () => {
      // Act & Assert
      expect(() => Weight.of(-100, "g")).toThrow(ValidationError);
    });
  });

  describe("Weight.add()", () => {
    test("when units are the same, it should return a sum Weight instance with the same unit", () => {
      // Arrange
      const weight1 = Weight.of(100, "g");
      const weight2 = Weight.of(100, "g");

      // Act
      const sum = weight1.add(weight2);

      // Assert
      expect(sum).toStrictEqual(Weight.of(200, "g"));
    });

    test("when units are different, it should throw a Validation error", () => {
      // Arrange
      const weight1 = Weight.of(100, "g");
      const weight2 = Weight.of(100, "kg");

      // Act & Assert
      expect(() => weight1.add(weight2)).toThrow(ValidationError);
    });

    
  });
});
