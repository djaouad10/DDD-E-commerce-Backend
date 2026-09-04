import { ValidationError } from "#/shared/errors/domain-error.js";
import { ProductId } from "./product-id.js";

// what to test
// DONE 1. generate()
// DONE 2. of()
// DONE 3. equals()

describe("ProductId Value Object", () => {
  describe("ProductId.generate()", () => {
    test("when called, it should generate a valid ProductId", () => {
      // Arrange & Act
      const productId = ProductId.generate();

      // Assert
      expect(productId.value).toMatch(/^prod_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("ProductId.of()", () => {
    test("when provided with a valid ProductId, it should return an ProductId instance with the provided value", () => {
      // Arrange & Act
      const productId = ProductId.of("prod_12345678901234567890123456789012");

      // Assert
      expect(productId).toBeInstanceOf(ProductId);
      expect(productId.value).toBe("prod_12345678901234567890123456789012");
    });

    test("when provided with an invalid ProductId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() =>
        ProductId.of("ord_12345678901234567890123456789012"),
      ).toThrow(ValidationError);
    });
  });

  describe("ProductId.equals()", () => {
    test("when provided with the same ProductId, it should return true", () => {
      // Arrange
      const productId1 = ProductId.of("prod_12345678901234567890123456789012");
      const productId2 = ProductId.of("prod_12345678901234567890123456789012");

      // Act & Assert
      expect(productId1.equals(productId2)).toBe(true);
    });

    test("when provided with a different ProductId, it should return false", () => {
      // Arrange
      const productId1 = ProductId.of("prod_12345678901234567890123456789012");
      const productId2 = ProductId.of("prod_98765432109876543210987654321098");

      // Act & Assert
      expect(productId1.equals(productId2)).toBe(false);
    });
  });
});
