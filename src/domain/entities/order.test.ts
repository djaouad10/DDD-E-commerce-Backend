import { ValidationError } from "#/shared/errors/domain-error.js";
import { Money } from "../value-objects/money.js";
import { OrderId } from "../value-objects/order-id.js";
import { ShippingDetails } from "../value-objects/shipping-details.js";
import { UserId } from "../value-objects/user-id.js";
import { VariationId } from "../value-objects/variation-id.js";
import { Weight } from "../value-objects/weight.js";
import { OrderItem } from "./order-item.js";
import { Order, OrderStatus } from "./order.js";
import { faker } from "@faker-js/faker";

// what to test:
// 1. factory
// 2. reconstiute
// 3. confirm
// 4. cancel
// 5. markAsPreTransit
// 6. getTotalItemsPrice
// 7. getTotalOrderPrice
// 8. getTotalDiscount
// 9. getTotalWeightInGrams
// 10. getTotalWeightInKg

describe("Order Entity", () => {
  const makeValidShippingDetails = (): ShippingDetails => {
    const validAlgerianPhoneNumber = "0678876545";

    return ShippingDetails.create(
      "TO_DESK",
      faker.person.fullName(),
      validAlgerianPhoneNumber,
      faker.number.int({ min: 1, max: 69 }),
      faker.location.city(),
      faker.location.zipCode("#####"),
      faker.location.streetAddress(),
      true,
      validAlgerianPhoneNumber,
      faker.internet.url(),
      faker.lorem.paragraphs(),
    );
  };

  const makeValidOrderItems = (): OrderItem[] => {
    return [
      OrderItem.create(
        VariationId.generate(),
        faker.number.int({ min: 1, max: 50 }),
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        Money.of(2900, "DZD"),
      ),
      OrderItem.create(
        VariationId.generate(),
        faker.number.int({ min: 1, max: 50 }),
        Money.of(2000, "DZD"),
        Weight.of(200, "g"),
        null,
      ),
    ];
  };

  const makeValidArguments = (): Parameters<typeof Order.create> => {
    return [
      UserId.generate(),
      makeValidShippingDetails(),
      makeValidOrderItems(),
      Money.of(400, "DZD"),
      "WORLD_EXPRESS",
    ];
  };

  describe("Order.create()", () => {
    test("when creating a new order with an empty orderItems list, it throws a ValidationError", () => {
      // Arrang
      const emptyOrderItems: OrderItem[] = [];
      const [
        userId,
        shippingDetails,
        _,
        shippingPriceAtOrderTime,
        selectedShippingProvider,
      ] = makeValidArguments();

      const factoryArguments: Parameters<typeof Order.create> = [
        userId,
        shippingDetails,
        emptyOrderItems, // empty items instead of valid ones
        shippingPriceAtOrderTime,
        selectedShippingProvider,
      ];

      // Act & Assert
      expect(() => Order.create(...factoryArguments)).toThrow(ValidationError);
    });

    test("when creating a new order with valid arguments, it generates a new OrderId", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);

      // Assert
      expect(order.id).toBeInstanceOf(OrderId);
    });

    test("when creating a new order with valid arguments, it sets tracking number to null", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getTrackingNumber()).toBeNull();
    });

    test("when creating a new order with valid arguments, it sets status to PENDING", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getStatus()).toBe(OrderStatus.PENDING);
    });

    test("when creating a new order with valid arguments, it sets shipping status to null", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getShippingStatus()).toBeNull();
    });

    test("when creating a new order with valid arguments, it sets createdAt to now", () => {
      // Arrange & Act
      const validArguments = makeValidArguments();

      const before = Date.now();
      const order = Order.create(...validArguments);
      const after = Date.now();

      // Assert
      expect(order.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before);
      expect(order.getCreatedAt().getTime()).toBeLessThanOrEqual(after);
    });

    test("when creating a new order with valid arguments, it sets updatedAt to now", () => {
      // Arrange & Act
      const validArguments = makeValidArguments();

      const before = Date.now();
      const order = Order.create(...validArguments);
      const after = Date.now();
      // Assert
      expect(order.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before);
      expect(order.getUpdatedAt().getTime()).toBeLessThanOrEqual(after);
    });

    test("when creating a new order with valid arguments, it preserves the userId", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.userId).toBe(validArguments[0]);
    });

    test("when creating a new order with valid arguments, it preserves the shippingDetails", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getShippingDetails()).toBe(validArguments[1]);
    });

    test("when creating a new order with valid arguments, it preserves the orderItems", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);

      // Assert
      expect(order.getOrderItems()).toHaveLength(2);
      expect(order.getOrderItems()).toBe(validArguments[2]); // if same reference
    });

    test("when creating a new order with valid arguments, it preserves the shippingPriceAtOrderTime", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getShippingPriceAtOrderTime()).toStrictEqual(
        Money.of(400, "DZD"),
      );
    });

    test("when creating a new order with valid arguments, it preserves the selectedShippingProvider", () => {
      // Arrange
      const validArguments = makeValidArguments();

      // Act
      const order = Order.create(...validArguments);

      // Assert
      expect(order.getSelectedShippingProvider()).toBe("WORLD_EXPRESS");
    });
  });
});
