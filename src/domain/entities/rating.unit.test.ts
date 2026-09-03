import { ValidationError } from "#/shared/errors/domain-error.js";
import { ProductId } from "../value-objects/product-id.js";
import { UserId } from "../value-objects/user-id.js";
import { Rating } from "./rating.js";

// What to test:
// 1. DONE create()
// 2. DONE reconstitute()

describe("Rating Entity", () => {
  describe("Rating.create()", () => {
    test("when arguments are valid, it should return a Rating instance with a generated RatingId", () => {
      // Arrange
      const userId = UserId.generate();
      const productId = ProductId.generate();

      // Act
      const rating = Rating.create(userId, productId, 5, "Great product!");

      // Assert
      expect(rating).toBeInstanceOf(Rating);
      expect(rating.productId).toStrictEqual(productId);
      expect(rating.userId).toStrictEqual(userId);
    });

    test("when rating is not between 0 and 5, it should throw a ValidationError", () => {
      // Arrange & Act & Assert
      expect(() =>
        Rating.create(UserId.generate(), ProductId.generate(), -1, ""),
      ).toThrow(ValidationError);
      expect(() =>
        Rating.create(UserId.generate(), ProductId.generate(), 6, ""),
      ).toThrow(ValidationError);
    });
  });

  describe("Rating.reconstitute()", () => {
    test("when arguments are valid, it should return a Rating instance", () => {
      // Arrange
      const userId = UserId.generate();
      const productId = ProductId.generate();

      // Act
      const rating = Rating.reconstitute(
        userId,
        productId,
        5,
        "Great product!",
        true,
        new Date(),
        new Date(),
      );

      // Assert
      expect(rating).toBeInstanceOf(Rating);
      expect(rating.productId).toStrictEqual(productId);
      expect(rating.userId).toStrictEqual(userId);
      expect(rating.getRating()).toBe(5);
      expect(rating.getComment()).toBe("Great product!");
      expect(rating.isApproved()).toBe(true);
    });

    test("when rating is not between 0 and 5, it should throw a ValidationError", () => {
      // Arrange & Act & Assert
      expect(() =>
        Rating.reconstitute(
          UserId.generate(),
          ProductId.generate(),
          -1,
          "",
          true,
          new Date(),
          new Date(),
        ),
      ).toThrow(ValidationError);
      expect(() =>
        Rating.reconstitute(
          UserId.generate(),
          ProductId.generate(),
          6,
          "",
          true,
          new Date(),
          new Date(),
        ),
      ).toThrow(ValidationError);
    });
  });
});
