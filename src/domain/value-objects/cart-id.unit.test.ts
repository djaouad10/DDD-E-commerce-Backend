import { ValidationError } from "#/shared/errors/domain-error.js";
import { CartId } from "./cart-id.js";

// what to test
// DONE 1. generate()
// DONE 2. of()
// DONE 3. equals()

describe("CartId Value Object", () => {
  describe("CartId.generate()", () => {
    test("when called, it should generate a valid CartId", () => {
      // Arrange & Act
      const cartId = CartId.generate();

      // Assert
      expect(cartId.value).toMatch(/^crt_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("CartId.of()", () => {
    test("when provided with a valid CartId, it should return an CartId instance with the provided value", () => {
      // Arrange & Act
      const cartId = CartId.of("crt_12345678901234567890123456789012");

      // Assert
      expect(cartId).toBeInstanceOf(CartId);
      expect(cartId.value).toBe("crt_12345678901234567890123456789012");
    });

    test("when provided with an invalid CartId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() => CartId.of("usr_12345678901234567890123456789012")).toThrow(
        ValidationError,
      );
    });
  });

  describe("CartId.equals()", () => {
    test("when provided with the same CartId, it should return true", () => {
      // Arrange
      const cartId1 = CartId.of("crt_12345678901234567890123456789012");
      const cartId2 = CartId.of("crt_12345678901234567890123456789012");

      // Act & Assert
      expect(cartId1.equals(cartId2)).toBe(true);
    });

    test("when provided with a different CartId, it should return false", () => {
      // Arrange
      const cartId1 = CartId.of("crt_12345678901234567890123456789012");
      const cartId2 = CartId.of("crt_98765432109876543210987654321098");

      // Act & Assert
      expect(cartId1.equals(cartId2)).toBe(false);
    });
  });
});
