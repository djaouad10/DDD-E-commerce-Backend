// What to test:
// 1. of()
// 2. add()
// 3. subtract()
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
});
