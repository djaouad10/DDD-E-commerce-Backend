import { ValidationError } from "#/shared/errors/domain-error.js";
import { CartId } from "../value-objects/cart-id.js";
import { UserId } from "../value-objects/user-id.js";
import { VariationId } from "../value-objects/variation-id.js";
import { CartItem } from "./cart-item.js";
import { Cart } from "./cart.js";

// What to test:
// 1. create()
// 2. reconstitute()
// 3. addItem()
// 4. removeItem()
// 5. updateItemQty()
// 6. clear()

describe("Cart Aggregate", () => {
  describe("Cart.create()", () => {
    test("when is created with empty items, it should return a Cart instance with a generated CartId", () => {
      // Arrange & Act
      const cart = Cart.create(UserId.generate(), []);

      // Assert
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBeInstanceOf(CartId);
    });

    test("when cart is created with at least one item, it should return a Cart instance with a generated CartId", () => {
      // Arrange & Act
      const cart = Cart.create(UserId.generate(), [
        CartItem.create(VariationId.generate(), 3),
      ]);

      // Assert
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBeInstanceOf(CartId);
    });

    test("when items contains duplicate items, it should throw a ValidationError", () => {
      // Arrange
      const duplicateItem = CartItem.create(VariationId.generate(), 3);
      const items = [
        duplicateItem,
        duplicateItem,
        CartItem.create(VariationId.generate(), 3),
        CartItem.create(VariationId.generate(), 3),
      ];

      // Act & Assert
      expect(() => Cart.create(UserId.generate(), items)).toThrow(
        ValidationError,
      );
    });
  });

  describe("Cart.reconstitute()", () => {
    test("when provided with a valid CartId, it should return a Cart instance with the provided CartId", () => {
      // Arrange & Act
      const cartId = CartId.generate();
      const cart = Cart.reconstitute(cartId, UserId.generate(), [], new Date());

      // Assert
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBe(cartId);
    });

    test("when cart is reconstituted with no items, it should return a Cart instance with a generated CartId", () => {
      // Arrange & Act
      const cart = Cart.reconstitute(
        CartId.generate(),
        UserId.generate(),
        [],
        new Date(),
      );

      // Assert
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBeInstanceOf(CartId);
    });

    test("when cart is reconstituted with at least one item, it should return a Cart instance with a generated CartId", () => {
      // Arrange & Act
      const cart = Cart.reconstitute(
        CartId.generate(),
        UserId.generate(),
        [CartItem.create(VariationId.generate(), 3)],
        new Date(),
      );

      // Assert
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBeInstanceOf(CartId);
    });

    test("when items contains duplicate items, it should throw a ValidationError", () => {
      // Arrange
      const duplicateItem = CartItem.create(VariationId.generate(), 3);
      const items = [
        duplicateItem,
        duplicateItem,
        CartItem.create(VariationId.generate(), 3),
        CartItem.create(VariationId.generate(), 3),
      ];

      // Act & Assert
      expect(() =>
        Cart.reconstitute(
          CartId.generate(),
          UserId.generate(),
          items,
          new Date(),
        ),
      ).toThrow(ValidationError);
    });
  });
});
