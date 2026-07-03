// What to test:
// DONE 1. of()
// DONE 2. add()
// DOEN 3. subtract()
// 4. multiply()

import { ValidationError } from "better-auth";
import { Money } from "./money.js";

describe("Money Value Object", () => {
  describe("Money.of()", () => {
    test("when amount is positive, it should return a Money instance", () => {
      // Arrange & Act
      const money = Money.of(100, "DZD");

      // Assert
      expect(money).toBeInstanceOf(Money);
    });

    test("when amount is zero, it should return a Money instance", () => {
      // Arrange & Act
      const money = Money.of(0, "DZD");

      // Assert
      expect(money).toBeInstanceOf(Money);
    });

    test("when amount is negative, it should throw a ValidationError", () => {
      // Arrange & Act & Assert
      expect(() => Money.of(-1, "DZD")).toThrow(ValidationError);
    });
  });

  describe("Money.add()", () => {
    test("when currencies are the same, it should return a sum Money instance with the same currency", () => {
      // Arrange
      const money1 = Money.of(100, "DZD");
      const money2 = Money.of(100, "DZD");

      // Act
      const result = money1.add(money2);

      // Assert
      expect(result).toStrictEqual(Money.of(200, "DZD"));
    });

    test("when currencies are different, it should throw a ValidationError", () => {
      // Arrange
      const money1 = Money.of(100, "DZD");
      // @ts-expect-error: I don't use USD, just to test the error
      const money2 = Money.of(100, "USD");

      // Act & Assert
      expect(() => money1.add(money2)).toThrow(ValidationError);
    });
  });

  describe("Money.subtract()", () => {
    test("when currencies are the same, it should return a difference Money instance with the same currency", () => {
      // Arrange
      const money1 = Money.of(200, "DZD");
      const money2 = Money.of(100, "DZD");

      // Act
      const result = money1.subtract(money2);

      // Assert
      expect(result).toStrictEqual(Money.of(100, "DZD"));
    });

    test("when currencies are different, it should throw a ValidationError", () => {
      // Arrange
      const money1 = Money.of(100, "DZD");
      // @ts-expect-error: I don't use USD, just to test the error
      const money2 = Money.of(100, "USD");

      // Act & Assert
      expect(() => money1.subtract(money2)).toThrow(ValidationError);
    });

    test("when resulting amount after subtraction is negative, it should throw a ValidationError", () => {
      // Arrange
      const money1 = Money.of(100, "DZD");
      const money2 = Money.of(200, "DZD");

      // Act & Assert
      expect(() => money1.subtract(money2)).toThrow(ValidationError);
    });
  });

  describe("Money.multiply()", () => {
    test("when provided with a negative qty, it should throw a ValidationError", () => {
      // Arrange
      const money1 = Money.of(100, "DZD");

      // Act & Assert
      expect(() => money1.multiply(-1)).toThrow(ValidationError);
    });

    test("when provided with a 0 qty, it should return zero Money with the same currency", () => {
      // Arrange
      const money1 = Money.of(100, "DZD");

      // Act
      const result = money1.multiply(0);

      // Assert
      expect(result).toStrictEqual(Money.of(0, "DZD"));
    });

    test("when provided with a positive qty, it should return amount * qty Money with the same currency", () => {
      // Arrange
      const money1 = Money.of(100, "DZD");

      // Act
      const result = money1.multiply(2);

      // Assert
      expect(result).toStrictEqual(Money.of(200, "DZD"));
    });
  });
});
