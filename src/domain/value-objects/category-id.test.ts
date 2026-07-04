import { ValidationError } from "#/shared/errors/domain-error.js";
import { CategoryId } from "./category-id.js";

// what to test
// DONE 1. generate()
// DONE 2. of()
// DONE 3. equals()

describe("CategoryId Value Object", () => {
  describe("CategoryId.generate()", () => {
    test("when called, it should generate a valid CategoryId", () => {
      // Arrange & Act
      const categoryId = CategoryId.generate();

      // Assert
      expect(categoryId.value).toMatch(/^cat_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("CategoryId.of()", () => {
    test("when provided with a valid CategoryId, it should return an CategoryId instance with the provided value", () => {
      // Arrange & Act
      const categoryId = CategoryId.of("cat_12345678901234567890123456789012");

      // Assert
      expect(categoryId).toBeInstanceOf(CategoryId);
      expect(categoryId.value).toBe("cat_12345678901234567890123456789012");
    });

    test("when provided with an invalid CategoryId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() =>
        CategoryId.of("usr_12345678901234567890123456789012"),
      ).toThrow(ValidationError);
    });
  });

  describe("CategoryId.equals()", () => {
    test("when provided with the same CategoryId, it should return true", () => {
      // Arrange
      const categoryId1 = CategoryId.of("cat_12345678901234567890123456789012");
      const categoryId2 = CategoryId.of("cat_12345678901234567890123456789012");

      // Act & Assert
      expect(categoryId1.equals(categoryId2)).toBe(true);
    });

    test("when provided with a different CategoryId, it should return false", () => {
      // Arrange
      const categoryId1 = CategoryId.of("cat_12345678901234567890123456789012");
      const categoryId2 = CategoryId.of("cat_98765432109876543210987654321098");

      // Act & Assert
      expect(categoryId1.equals(categoryId2)).toBe(false);
    });
  });
});
