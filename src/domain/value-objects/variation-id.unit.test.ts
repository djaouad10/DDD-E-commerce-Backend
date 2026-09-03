import { ValidationError } from "#/shared/errors/domain-error.js";
import { VariationId } from "./variation-id.js";

// what to test
// DONE 1. generate()
// DONE 2. of()
// DONE 3. equals()

describe("VariationId Value Object", () => {
  describe("VariationId.generate()", () => {
    test("when called, it should generate a valid VariationId", () => {
      // Arrange & Act
      const variationId = VariationId.generate();

      // Assert
      expect(variationId.value).toMatch(/^var_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("VariationId.of()", () => {
    test("when provided with a valid VariationId, it should return an VariationId instance with the provided value", () => {
      // Arrange & Act
      const variationId = VariationId.of(
        "var_12345678901234567890123456789012",
      );

      // Assert
      expect(variationId).toBeInstanceOf(VariationId);
      expect(variationId.value).toBe("var_12345678901234567890123456789012");
    });

    test("when provided with an invalid VariationId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() =>
        VariationId.of("ord_12345678901234567890123456789012"),
      ).toThrow(ValidationError);
    });
  });

  describe("VariationId.equals()", () => {
    test("when provided with the same VariationId, it should return true", () => {
      // Arrange
      const variationId1 = VariationId.of(
        "var_12345678901234567890123456789012",
      );
      const variationId2 = VariationId.of(
        "var_12345678901234567890123456789012",
      );

      // Act & Assert
      expect(variationId1.equals(variationId2)).toBe(true);
    });

    test("when provided with a different VariationId, it should return false", () => {
      // Arrange
      const variationId1 = VariationId.of(
        "var_12345678901234567890123456789012",
      );
      const variationId2 = VariationId.of(
        "var_98765432109876543210987654321098",
      );

      // Act & Assert
      expect(variationId1.equals(variationId2)).toBe(false);
    });
  });
});
