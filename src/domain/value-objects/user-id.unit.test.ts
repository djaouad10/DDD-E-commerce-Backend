import { ValidationError } from "#/shared/errors/domain-error.js";
import { UserId } from "./user-id.js";

// what to test
// DONE 1. generate()
// DONE 2. of()
// DONE 3. equals()

describe("UserId Value Object", () => {
  describe("UserId.generate()", () => {
    test("when called, it should generate a valid UserId", () => {
      // Arrange & Act
      const userId = UserId.generate();

      // Assert

      expect(userId.value).toMatch(/^usr_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("UserId.of()", () => {
    test("when provided with a valid UserId, it should return a UserId instance with the provided value", () => {
      // Arrange & Act
      const userId = UserId.of("usr_12345678901234567890123456789012");

      // Assert
      expect(userId).toBeInstanceOf(UserId);
      expect(userId.value).toBe("usr_12345678901234567890123456789012");
    });

    test("when provided with an invalid UserId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() => UserId.of("ord_12345678901234567890123456789012")).toThrow(
        ValidationError,
      );
    });
  });

  describe("UserId.equals()", () => {
    test("when provided with the same UserId, it should return true", () => {
      // Arrange
      const userId1 = UserId.of("usr_12345678901234567890123456789012");
      const userId2 = UserId.of("usr_12345678901234567890123456789012");

      // Act & Assert
      expect(userId1.equals(userId2)).toBe(true);
    });

    test("when provided with a different UserId, it should return false", () => {
      // Arrange
      const userId1 = UserId.of("usr_12345678901234567890123456789012");
      const userId2 = UserId.of("usr_98765432109876543210987654321098");

      // Act & Assert
      expect(userId1.equals(userId2)).toBe(false);
    });
  });
});
