import { ValidationError } from "better-auth";
import { CartItemId } from "../value-objects/cart-item-id.js";
import { VariationId } from "../value-objects/variation-id.js";
import { CartItem } from "./cart-item.js";

// What to test:
// DONE 1. create()
// DONE 2. reconstitute()
// DONE 3. updateQty()

describe("CartItem Entity", () => {
  describe("CartItem.create()", () => {
    test("when arguments are valid, it should return a CartItem instance with a generated CartItemId", () => {
      // Arrange & Act
      const cartItem = CartItem.create(VariationId.generate(), 3);

      // Assert
      expect(cartItem).toBeInstanceOf(CartItem);
      expect(cartItem.id).toBeInstanceOf(CartItemId);
    });

    test("when qty is zero, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() => CartItem.create(VariationId.generate(), 0)).toThrow(
        ValidationError,
      );
    });

    test("when qty is negative, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() => CartItem.create(VariationId.generate(), -1)).toThrow(
        ValidationError,
      );
    });
  });

  describe("CartItem.reconstitute()", () => {
    test("when arguments are valid, it should return a CartItem instance", () => {
      // Arrange & Act
      const cartItem = CartItem.reconstitute(
        CartItemId.generate(),
        VariationId.generate(),
        3,
        new Date(),
      );

      // Assert
      expect(cartItem).toBeInstanceOf(CartItem);
    });

    test("when qty is zero, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() =>
        CartItem.reconstitute(
          CartItemId.generate(),
          VariationId.generate(),
          0,
          new Date(),
        ),
      ).toThrow(ValidationError);
    });

    test("when qty is negative, it should throw a ValidationError", () => {
      // Act & Assert
      expect(() =>
        CartItem.reconstitute(
          CartItemId.generate(),
          VariationId.generate(),
          -1,
          new Date(),
        ),
      ).toThrow(ValidationError);
    });
  });

  describe("CartItem.updateQty()", () => {
    test("when arguments are valid, it should update the qty", () => {
      // Arrange
      const cartItem = CartItem.create(VariationId.generate(), 3);

      // Act
      cartItem.updateQty(5);

      // Assert
      expect(cartItem.getQty()).toBe(5);
    });

    test("when qty is zero, it should throw a ValidationError", () => {
      // Arrange
      const cartItem = CartItem.create(VariationId.generate(), 3);

      // Act & Assert
      expect(() => cartItem.updateQty(0)).toThrow(ValidationError);
    });

    test("when qty is negative, it should throw a ValidationError", () => {
      // Arrange
      const cartItem = CartItem.create(VariationId.generate(), 3);

      // Act & Assert
      expect(() => cartItem.updateQty(-1)).toThrow(ValidationError);
    });
  });
});
