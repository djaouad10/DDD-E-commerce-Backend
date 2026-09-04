import { faker } from "@faker-js/faker";
import { VariationId } from "../value-objects/variation-id.js";
import { OrderItem } from "./order-item.js";
import { Money } from "../value-objects/money.js";
import { Weight } from "../value-objects/weight.js";
import { OrderItemId } from "../value-objects/order-item-id.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

// What to test:
// DONE 1. creat()
// DONE 2. reconstitute()
// DONE 3. lineTotal()
// DONE 4. totalWeightInGrams()
// DONE 5. hasDiscount()
// DONE 6. discountAmount()

describe("OrderItem Entity", () => {
  const validVariationId = VariationId.generate();
  const validQty = faker.number.int({ min: 1, max: 50 });
  const validUnitPrice = Money.of(3000, "DZD");
  const validWeight = Weight.of(100, "g");
  const validUnitDiscountPrice = Money.of(2900, "DZD");

  describe("OrderItem.create()", () => {
    test("when arguments are valid, it should return a OrderItem instance", () => {
      // Arrange & Act
      const orderItem = OrderItem.create(
        validVariationId,
        validQty,
        validUnitPrice,
        validWeight,
        validUnitDiscountPrice,
      );

      // Assert
      expect(orderItem).toBeInstanceOf(OrderItem);
    });

    test("when arguments are valid, it should generate an orderItemId", () => {
      // Arrange & Act
      const orderItem = OrderItem.create(
        validVariationId,
        validQty,
        validUnitPrice,
        validWeight,
        validUnitDiscountPrice,
      );

      // Assert
      expect(orderItem.id).toBeInstanceOf(OrderItemId);
    });

    test("when item quantity is 0, it should throw a Validation error", () => {
      // Arrange
      const qty = 0;

      // Act & Assert
      expect(() => {
        OrderItem.create(
          validVariationId,
          qty,
          validUnitPrice,
          validWeight,
          validUnitDiscountPrice,
        );
      }).toThrow(ValidationError);
    });

    test("when item quantity is less than 0, it should throw a Validation error", () => {
      // Arrange
      const qty = -1;

      // Act & Assert
      expect(() => {
        OrderItem.create(
          validVariationId,
          qty,
          validUnitPrice,
          validWeight,
          validUnitDiscountPrice,
        );
      }).toThrow(ValidationError);
    });

    test("when weight is not in grams, it should throw a Validation error", () => {
      // Arrange
      const weight = Weight.of(100, "kg");

      // Act & Assert
      expect(() => {
        OrderItem.create(
          validVariationId,
          validQty,
          validUnitPrice,
          weight,
          validUnitDiscountPrice,
        );
      }).toThrow(ValidationError);
    });
  });

  describe("OrderItem.reconstitute()", () => {
    test("when arguments are valid, it should return a OrderItem instance", () => {
      // Arrange & Act
      const orderItem = OrderItem.reconstitute(
        OrderItemId.generate(),
        validVariationId,
        validQty,
        validUnitPrice,
        validUnitDiscountPrice,
        validWeight,
      );

      // Assert
      expect(orderItem).toBeInstanceOf(OrderItem);
    });

    test("when item quantity is 0, it should throw a Validation error", () => {
      // Arrange
      const qty = 0;

      // Act & Assert
      expect(() => {
        OrderItem.reconstitute(
          OrderItemId.generate(),
          validVariationId,
          qty,
          validUnitPrice,
          validUnitDiscountPrice,
          validWeight,
        );
      }).toThrow(ValidationError);
    });

    test("when item quantity is less than 0, it should throw a Validation error", () => {
      // Arrange
      const qty = -1;

      // Act & Assert
      expect(() => {
        OrderItem.reconstitute(
          OrderItemId.generate(),
          validVariationId,
          qty,
          validUnitPrice,
          validUnitDiscountPrice,
          validWeight,
        );
      }).toThrow(ValidationError);
    });

    test("when weight is not in grams, it should throw a Validation error", () => {
      // Arrange
      const weight = Weight.of(100, "kg");

      // Act & Assert
      expect(() => {
        OrderItem.reconstitute(
          OrderItemId.generate(),
          validVariationId,
          validQty,
          validUnitPrice,
          validUnitDiscountPrice,
          weight,
        );
      }).toThrow(ValidationError);
    });

    test("when arguments are valid, it should use the provided orderItemId", () => {
      // Arrange & Act
      const orderItemId = OrderItemId.generate();
      const orderItem = OrderItem.reconstitute(
        orderItemId,
        validVariationId,
        validQty,
        validUnitPrice,
        validUnitDiscountPrice,
        validWeight,
      );

      // Assert
      expect(orderItem.id).toBe(orderItemId);
    });
  });

  describe("OrderItem.lineTotal()", () => {
    test("when no discount, it should return the line total using the unit price", () => {
      // Arrange
      const price = Money.of(3000, "DZD");

      // Act
      const orderItem = OrderItem.reconstitute(
        OrderItemId.generate(),
        validVariationId,
        3,
        price,
        null,
        validWeight,
      );

      // Assert
      expect(orderItem.lineTotal()).toStrictEqual(price.multiply(3));
    });

    test("when item has discount, it should return the line total using the discount price", () => {
      // Arrange
      const price = Money.of(3000, "DZD");
      const discountPrice = Money.of(2000, "DZD");

      // Act
      const orderItem = OrderItem.reconstitute(
        OrderItemId.generate(),
        validVariationId,
        3,
        price,
        discountPrice,
        validWeight,
      );

      // Assert
      expect(orderItem.lineTotal()).toStrictEqual(discountPrice.multiply(3));
    });
  });

  describe("OrderItem.totalWeightInGrams()", () => {
    test("when arguments are valid, it should return the weight in grams * qty", () => {
      // Arrange
      const weight = Weight.of(100, "g");

      // Act
      const orderItem = OrderItem.reconstitute(
        OrderItemId.generate(),
        validVariationId,
        3,
        validUnitPrice,
        validUnitDiscountPrice,
        weight,
      );

      // Assert
      expect(orderItem.totalWeightInGrams()).toStrictEqual(weight.multiply(3));
    });
  });

  describe("OrderItem.hasDiscount()", () => {
    test("when no discount, it should return false", () => {
      // Arrange
      const orderItem = OrderItem.reconstitute(
        OrderItemId.generate(),
        validVariationId,
        3,
        validUnitPrice,
        null,
        validWeight,
      );

      // Assert
      expect(orderItem.hasDiscount()).toBe(false);
    });

    test("when item has discount, it should return true", () => {
      // Arrange
      const orderItem = OrderItem.reconstitute(
        OrderItemId.generate(),
        validVariationId,
        3,
        validUnitPrice,
        validUnitDiscountPrice,
        validWeight,
      );

      // Assert
      expect(orderItem.hasDiscount()).toBe(true);
    });
  });

  describe("OrderItem.discountAmount()", () => {
    test("when no discount, it should return 0 Money", () => {
      // Arrange & Act
      const orderItem = OrderItem.reconstitute(
        OrderItemId.generate(),
        validVariationId,
        3,
        validUnitPrice,
        null,
        validWeight,
      );

      // Assert
      expect(orderItem.discountAmount()).toStrictEqual(Money.of(0, "DZD"));
    });

    test("when item has discount, it should return the total discount amount", () => {
      // Arrange
      const price = Money.of(3000, "DZD");
      const discount = Money.of(2000, "DZD");
      // Act
      const orderItem = OrderItem.reconstitute(
        OrderItemId.generate(),
        validVariationId,
        3,
        price,
        discount,
        validWeight,
      );

      // Assert
      // discount_amount = (price - discount) * qty
      expect(orderItem.discountAmount()).toStrictEqual(
        price.subtract(discount).multiply(3),
      );
    });
  });
});
