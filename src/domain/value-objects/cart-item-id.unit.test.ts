import { ValidationError } from "#/shared/errors/domain-error.js";
import { CartItemId } from "./cart-item-id.js";

// what to test
// DONE 1. generate()
// DONE 2. of()
// DONE 3. equals()

describe("CartItemId Value Object", () => {
  describe("CartItemId.generate()", () => {
    test("when called, it should generate a valid CartItemId", () => {
      // Arrange & Act
      const cartItemId = CartItemId.generate();

      // Assert
      expect(cartItemId.value).toMatch(/^crtitm_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("CartItemId.of()", () => {
    test("when provided with a valid CartItemId, it should return an CartItemId instance with the provided value", () => {
      // Arrange & Act
      const cartItemId = CartItemId.of(
        "crtitm_12345678901234567890123456789012",
      );

      // Assert
      expect(cartItemId).toBeInstanceOf(CartItemId);
      expect(cartItemId.value).toBe("crtitm_12345678901234567890123456789012");
    });

    test("when provided with an invalid CartItemId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() =>
        CartItemId.of("usr_12345678901234567890123456789012"),
      ).toThrow(ValidationError);
    });
  });

  describe("CartItemId.equals()", () => {
    test("when provided with the same CartItemId, it should return true", () => {
      // Arrange
      const cartItemId1 = CartItemId.of(
        "crtitm_12345678901234567890123456789012",
      );
      const cartItemId2 = CartItemId.of(
        "crtitm_12345678901234567890123456789012",
      );

      // Act & Assert
      expect(cartItemId1.equals(cartItemId2)).toBe(true);
    });

    test("when provided with a different CartItemId, it should return false", () => {
      // Arrange
      const cartItemId1 = CartItemId.of(
        "crtitm_12345678901234567890123456789012",
      );
      const cartItemId2 = CartItemId.of(
        "crtitm_98765432109876543210987654321098",
      );

      // Act & Assert
      expect(cartItemId1.equals(cartItemId2)).toBe(false);
    });
  });
});
