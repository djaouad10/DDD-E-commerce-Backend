// what to test
// DONE 1. generate()
// 2. of()
// 3. equals()

import { ValidationError } from "#/shared/errors/domain-error.js";
import { OrderId } from "./order-id.js";

describe("OrderId Value Object", () => {
  describe("OrderId.generate()", () => {
    test("when called, it should generate a valid OrderId", () => {
      // Arrange & Act
      const orderId = OrderId.generate();

      // Assert
      expect(orderId.value).toMatch(/^ord_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("OrderId.of()", () => {
    test("when provided with a valid OrderId, it should return an OrderId instance with the provided value", () => {
      // Arrange & Act
      const orderId = OrderId.of("ord_12345678901234567890123456789012");

      // Assert
      expect(orderId).toBeInstanceOf(OrderId);
      expect(orderId.value).toBe("ord_12345678901234567890123456789012");
    });

    test("when provided with an invalid OrderId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() => OrderId.of("usr_12345678901234567890123456789012")).toThrow(
        ValidationError,
      );
    });
  });
});
