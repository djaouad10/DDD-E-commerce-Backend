import { ValidationError } from "#/shared/errors/domain-error.js";
import { FileId } from "./file-id.js";

// what to test
// DONE 1. generate()
// DONE 2. of()
// DONE 3. equals()

describe("FileId Value Object", () => {
  describe("FileId.generate()", () => {
    test("when called, it should generate a valid FileId", () => {
      // Arrange & Act
      const fileId = FileId.generate();

      // Assert
      expect(fileId.value).toMatch(/^file_[a-zA-Z0-9]{32}$/);
    });
  });

  describe("FileId.of()", () => {
    test("when provided with a valid FileId, it should return an FileId instance with the provided value", () => {
      // Arrange & Act
      const fileId = FileId.of("file_12345678901234567890123456789012");

      // Assert
      expect(fileId).toBeInstanceOf(FileId);
      expect(fileId.value).toBe("file_12345678901234567890123456789012");
    });

    test("when provided with an invalid FileId, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() => FileId.of("usr_12345678901234567890123456789012")).toThrow(
        ValidationError,
      );
    });
  });

  describe("FileId.equals()", () => {
    test("when provided with the same FileId, it should return true", () => {
      // Arrange
      const fileId1 = FileId.of("file_12345678901234567890123456789012");
      const fileId2 = FileId.of("file_12345678901234567890123456789012");

      // Act & Assert
      expect(fileId1.equals(fileId2)).toBe(true);
    });

    test("when provided with a different FileId, it should return false", () => {
      // Arrange
      const fileId1 = FileId.of("file_12345678901234567890123456789012");
      const fileId2 = FileId.of("file_98765432109876543210987654321098");

      // Act & Assert
      expect(fileId1.equals(fileId2)).toBe(false);
    });
  });
});
