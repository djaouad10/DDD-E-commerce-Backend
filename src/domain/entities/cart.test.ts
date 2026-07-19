import { ValidationError } from "#/shared/errors/domain-error.js";
import { CartId } from "../value-objects/cart-id.js";
import { UserId } from "../value-objects/user-id.js";
import { VariationId } from "../value-objects/variation-id.js";
import { CartItem } from "./cart-item.js";
import { Cart } from "./cart.js";

// What to test:
// DONE 1. create()
// DONE 2. reconstitute()
// DONE 3. addItem()
// DONE 4. removeItem()
// DONE 5. updateItemQty()
// DONE 6. clear()

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
      const cart = Cart.reconstitute(cartId, UserId.generate(), []);

      // Assert
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBe(cartId);
    });

    test("when cart is reconstituted with no items, it should return a Cart instance with a generated CartId", () => {
      // Arrange & Act
      const cart = Cart.reconstitute(CartId.generate(), UserId.generate(), []);

      // Assert
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBeInstanceOf(CartId);
    });

    test("when cart is reconstituted with at least one item, it should return a Cart instance with a generated CartId", () => {
      // Arrange & Act
      const cart = Cart.reconstitute(CartId.generate(), UserId.generate(), [
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
      expect(() =>
        Cart.reconstitute(CartId.generate(), UserId.generate(), items),
      ).toThrow(ValidationError);
    });
  });

  describe("Cart.addItem()", () => {
    test("when item is added, it should add the item to the cart", () => {
      // Arrange
      const cart = Cart.create(UserId.generate(), []);
      const item = CartItem.create(VariationId.generate(), 3);

      // Act
      cart.addItem(item);

      // Assert
      expect(cart.getItems()).toContainEqual(item);
    });

    test("when item variation is already in the cart, it should throw a ValidationError", () => {
      // Arrange
      const item = CartItem.create(VariationId.generate(), 3);
      const cart = Cart.create(UserId.generate(), [item]);

      // Act & Assert
      expect(() => cart.addItem(item)).toThrow(ValidationError);
    });

    test("when cart is full, it should throw a ValidationError", () => {
      // Arrange
      const cart = Cart.create(UserId.generate(), []);

      for (let i = 0; i < 50; i++) {
        cart.addItem(CartItem.create(VariationId.generate(), 3));
      }

      // Act & Assert
      expect(() =>
        cart.addItem(CartItem.create(VariationId.generate(), 3)),
      ).toThrow(ValidationError);
    });
  });

  describe("Cart.removeItem()", () => {
    test("when item is removed, it should remove the item from the cart", () => {
      // Arrange
      const item = CartItem.create(VariationId.generate(), 3);
      const cart = Cart.create(UserId.generate(), [item]);

      // Act
      cart.removeItem(item.id);

      // Assert
      expect(cart.getItems()).not.toContainEqual(item);
    });

    test("when item is not in the cart, it should throw a ValidationError", () => {
      // Arrange
      const item = CartItem.create(VariationId.generate(), 3);
      const cart = Cart.create(UserId.generate(), []);

      // Act & Assert
      expect(() => cart.removeItem(item.id)).toThrow(ValidationError);
    });
  });

  describe("Cart.updateItemQty()", () => {
    test("when item qty is updated, it should update the item qty", () => {
      // Arrange
      const item = CartItem.create(VariationId.generate(), 3);
      const cart = Cart.create(UserId.generate(), [item]);

      // Act
      cart.updateItemQty(item.id, 5);

      // Assert
      expect(
        cart
          .getItems()
          .find((i) => i.id.equals(item.id))
          ?.getQty(),
      ).toBe(5);
    });

    test("when item is not in the cart, it should throw a ValidationError", () => {
      // Arrange
      const item = CartItem.create(VariationId.generate(), 3);
      const cart = Cart.create(UserId.generate(), []);

      // Act & Assert
      expect(() => cart.updateItemQty(item.id, 5)).toThrow(ValidationError);
    });
  });

  describe("Cart.clear()", () => {
    test("when cart is cleared, it should remove all items from the cart", () => {
      // Arrange
      const item = CartItem.create(VariationId.generate(), 3);
      const cart = Cart.create(UserId.generate(), [item]);

      // Act
      cart.clear();

      // Assert
      expect(cart.getItems()).toHaveLength(0);
    });
  });
});
