import { ValidationError } from "#/shared/errors/domain-error.js";
import { OrderItemId } from "./order-item-id.js";

// what to test
// DONE 1. generate()
// DONE 2. of()
// DONE 3. equals()

describe("OrderItemId Value Object", () => {
  describe("OrderItemId.generate()", () => {
    test("when called, it should generate a valid OrderItemId", () => {
      // Arrange & Act
      const orderItemId = OrderItemId.generate();

      // Assert

      expect(orderItemId.value).toMatch(/^orditm_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("OrderItemId.of()", () => {
    test("when provided with a valid OrderItemId, it should return an OrderItemId instance with the provided value", () => {
      // Arrange & Act
      const orderItemId = OrderItemId.of(
        "orditm_12345678901234567890123456789012",
      );

      // Assert
      expect(orderItemId).toBeInstanceOf(OrderItemId);
      expect(orderItemId.value).toBe("orditm_12345678901234567890123456789012");
    });

    test("when provided with an invalid OrderItemId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() =>
        OrderItemId.of("ord_12345678901234567890123456789012"),
      ).toThrow(ValidationError);
    });
  });

  describe("OrderItemId.equals()", () => {
    test("when provided with the same OrderItemId, it should return true", () => {
      // Arrange
      const orderItemId1 = OrderItemId.of(
        "orditm_12345678901234567890123456789012",
      );
      const orderItemId2 = OrderItemId.of(
        "orditm_12345678901234567890123456789012",
      );

      // Act & Assert
      expect(orderItemId1.equals(orderItemId2)).toBe(true);
    });

    test("when provided with a different OrderItemId, it should return false", () => {
      // Arrange
      const orderItemId1 = OrderItemId.of(
        "orditm_12345678901234567890123456789012",
      );
      const orderItemId2 = OrderItemId.of(
        "orditm_98765432109876543210987654321098",
      );

      // Act & Assert
      expect(orderItemId1.equals(orderItemId2)).toBe(false);
    });
  });
});
