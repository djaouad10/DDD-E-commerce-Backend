import { ValidationError } from "#/shared/errors/domain-error.js";
import { Money } from "../value-objects/money.js";
import { OrderId } from "../value-objects/order-id.js";
import { ShippingDetails } from "../value-objects/shipping-details.js";
import { UserId } from "../value-objects/user-id.js";
import { VariationId } from "../value-objects/variation-id.js";
import { Weight } from "../value-objects/weight.js";
import { OrderItem } from "./order-item.js";
import { Order, OrderStatus, ShippingProvider } from "./order.js";
import { faker } from "@faker-js/faker";

// what to test:
// DONE 1. factory
// DONE 2. reconstiute
// DONE 3. confirm
// DONE 4. cancel
// DONE 5. markAsPreTransit
// DONE 6. getTotalItemsPrice
// DONE 7. getTotalOrderPrice
// DONE 8. getTotalDiscount
// DONE 9. getTotalWeightInGrams
// DONE 10. getTotalWeightInKg

type MakeValidReconstituteArgumentsParams = {
  orderId?: OrderId;
  userId?: UserId;
  shippingDetails?: ShippingDetails;
  orderItems?: OrderItem[];
  shippingPriceAtOrderTime?: Money;
  selectedShippingProvider?: ShippingProvider;
  createdAt?: Date;
  updatedAt?: Date;
  trackingNumber?: string | null;
  status?: OrderStatus;
  shippingStatus?: string | null;
};

describe("Order Aggregate", () => {
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

  const makeValidCreateArguments = (): Parameters<typeof Order.create> => {
    return [
      UserId.generate(),
      makeValidShippingDetails(),
      makeValidOrderItems(),
      Money.of(400, "DZD"),
      ShippingProvider.WORLD_EXPRESS,
    ];
  };

  const makeValidReconstitueArguments = (
    options?: MakeValidReconstituteArgumentsParams,
  ): Parameters<typeof Order.reconstitute> => {
    const trackingNumber = options?.trackingNumber ?? "ECO_AZDS274JD83";
    const status = options?.status ?? OrderStatus.CONFIRMED;
    const shippingStatus = options?.shippingStatus ?? null;
    const shippingPrice =
      options?.shippingPriceAtOrderTime ?? Money.of(400, "DZD");
    const shippingProvider: ShippingProvider =
      options?.selectedShippingProvider ?? ShippingProvider.WORLD_EXPRESS;
    const date = new Date();

    return [
      options?.orderId ?? OrderId.generate(),
      options?.userId ?? UserId.generate(),
      trackingNumber,
      status,
      shippingStatus,
      shippingPrice,
      shippingProvider,
      options?.shippingDetails ?? makeValidShippingDetails(),
      options?.orderItems ?? makeValidOrderItems(),
      date,
      date,
    ];
  };

  describe("Order.create()", () => {
    test("when creating a new order with an empty orderItems list, it should throw a ValidationError", () => {
      // Arrang
      const emptyOrderItems: OrderItem[] = [];
      const [
        userId,
        shippingDetails,
        _,
        shippingPriceAtOrderTime,
        selectedShippingProvider,
      ] = makeValidCreateArguments();

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

    test("when creating a new order with valid arguments, it should generate a new OrderId", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);

      // Assert
      expect(order.id).toBeInstanceOf(OrderId);
    });

    test("when creating a new order with valid arguments, it should set tracking number to null", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getTrackingNumber()).toBeNull();
    });

    test("when creating a new order with valid arguments, it should set status to PENDING", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getStatus()).toBe(OrderStatus.PENDING);
    });

    test("when creating a new order with valid arguments, it should set shipping status to null", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getShippingStatus()).toBeNull();
    });

    test("when creating a new order with valid arguments, it should set createdAt to now", () => {
      // Arrange & Act
      const validArguments = makeValidCreateArguments();

      const before = Date.now();
      const order = Order.create(...validArguments);
      const after = Date.now();

      // Assert
      expect(order.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before);
      expect(order.getCreatedAt().getTime()).toBeLessThanOrEqual(after);
    });

    test("when creating a new order with valid arguments, it should set updatedAt to now", () => {
      // Arrange & Act
      const validArguments = makeValidCreateArguments();

      const before = Date.now();
      const order = Order.create(...validArguments);
      const after = Date.now();
      // Assert
      expect(order.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before);
      expect(order.getUpdatedAt().getTime()).toBeLessThanOrEqual(after);
    });

    test("when creating a new order with valid arguments, it should preserve the userId", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.userId).toBe(validArguments[0]);
    });

    test("when creating a new order with valid arguments, it should preserve the shippingDetails", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getShippingDetails()).toBe(validArguments[1]);
    });

    test("when creating a new order with valid arguments, it should preserve the orderItems", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);

      // Assert
      expect(order.getOrderItems()).toHaveLength(2);
      expect(order.getOrderItems()).toBe(validArguments[2]); // if same reference
    });

    test("when creating a new order with valid arguments, it should preserve the shippingPriceAtOrderTime", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);
      // Assert
      expect(order.getShippingPriceAtOrderTime()).toStrictEqual(
        Money.of(400, "DZD"),
      );
    });

    test("when creating a new order with valid arguments, it should preserve the selectedShippingProvider", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();

      // Act
      const order = Order.create(...validArguments);

      // Assert
      expect(order.getSelectedShippingProvider()).toBe(
        ShippingProvider.WORLD_EXPRESS,
      );
    });
  });

  describe("Order.reconstitute()", () => {
    test("when reconstructing an order using valid arguments, it should reconstruct order successfully", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order).toBeInstanceOf(Order);
    });

    test("when reconstructing an order using valid arguments, it should preserve the id", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.id).toBe(validArguments[0]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the userId", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.userId).toBe(validArguments[1]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the trackingNumber", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getTrackingNumber()).toBe(validArguments[2]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the status", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getStatus()).toBe(validArguments[3]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the shippingStatus", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getShippingStatus()).toBe(validArguments[4]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the shippingPriceAtOrderTime", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getShippingPriceAtOrderTime()).toBe(validArguments[5]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the selectedShippingProvider", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getSelectedShippingProvider()).toBe(validArguments[6]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the shippingDetails", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getShippingDetails()).toBe(validArguments[7]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the orderItems", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getOrderItems()).toBe(validArguments[8]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the createdAt", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getCreatedAt()).toBe(validArguments[9]);
    });

    test("when reconstructing an order using valid arguments, it should preserve the updatedAt", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments();

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getUpdatedAt()).toBe(validArguments[10]);
    });
  });

  describe("Order.confirm()", () => {
    test("when confirming a pending order, it should set the status to confirmed and updates updatedAt", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();
      const order = Order.create(...validArguments);
      const originalUpdatedAt = order.getUpdatedAt();

      // Act
      order.confirm();

      // Assert
      expect(order.getStatus()).toBe(OrderStatus.CONFIRMED);
      expect(order.getUpdatedAt()).not.toBe(originalUpdatedAt);
    });

    test("when confirming a confirmed order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.CONFIRMED,
      });

      // Act & Assert
      expect(() => Order.reconstitute(...validArguments).confirm()).toThrow(
        ValidationError,
      );
    });

    test("when confirming a cancelled order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.CANCELLED,
      });

      // Act & Assert
      expect(() => Order.reconstitute(...validArguments).confirm()).toThrow(
        ValidationError,
      );
    });

    test("when confirming a pre-transit order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.PRE_TRANSIT,
      });

      // Act & Assert
      expect(() => Order.reconstitute(...validArguments).confirm()).toThrow(
        ValidationError,
      );
    });

    test("when confirming a shipping order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.SHIPPING,
      });

      // Act & Assert
      expect(() => Order.reconstitute(...validArguments).confirm()).toThrow(
        ValidationError,
      );
    });

    test("when confirming a delivered order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.DELIVERED,
      });

      // Act & Assert
      expect(() => Order.reconstitute(...validArguments).confirm()).toThrow(
        ValidationError,
      );
    });

    test("when confirming a returned order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.RETURNED,
      });

      // Act & Assert
      expect(() => Order.reconstitute(...validArguments).confirm()).toThrow(
        ValidationError,
      );
    });

    test("when confirming a suspended order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.SUSPENDED,
      });

      // Act & Assert
      expect(() => Order.reconstitute(...validArguments).confirm()).toThrow(
        ValidationError,
      );
    });
  });

  describe("Order.cancel()", () => {
    test("when cancelling a pending order, it should set the status to cancelled and updates updatedAt", () => {
      // Arrange
      const validArguments = makeValidCreateArguments();
      const order = Order.create(...validArguments);
      const originalUpdatedAt = order.getUpdatedAt();

      // Act
      order.cancel();

      // Assert
      expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
      expect(order.getUpdatedAt()).not.toBe(originalUpdatedAt);
    });

    test("when cancelling a confirmed order, it should set the status to cancelled and updates updatedAt", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.CONFIRMED,
      });
      const order = Order.reconstitute(...validArguments);
      const originalUpdatedAt = order.getUpdatedAt();

      // Act
      order.cancel();

      // Assert
      expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
      expect(order.getUpdatedAt()).not.toBe(originalUpdatedAt);
    });

    test("when cancelling a pre-transit order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.PRE_TRANSIT,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.cancel()).toThrow(ValidationError);
    });

    test("when cancelling a shipping order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.SHIPPING,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.cancel()).toThrow(ValidationError);
    });

    test("when cancelling a delivered order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.DELIVERED,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.cancel()).toThrow(ValidationError);
    });

    test("when cancelling a returned order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.RETURNED,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.cancel()).toThrow(ValidationError);
    });

    test("when cancelling a suspended order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.SUSPENDED,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.cancel()).toThrow(ValidationError);
    });

    test("when cancelling a cancelled order, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.CANCELLED,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.cancel()).toThrow(ValidationError);
    });
  });

  describe("Order.markAsPreTransit()", () => {
    test("when marking a confirmed order as pre-transit, it should set the status to pre-transit and updates updatedAt", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.CONFIRMED,
      });

      const order = Order.reconstitute(...validArguments);
      const originalUpdatedAt = order.getUpdatedAt();

      // Act
      order.markAsPreTransit();

      // Assert
      expect(order.getStatus()).toBe(OrderStatus.PRE_TRANSIT);
      expect(order.getUpdatedAt()).not.toBe(originalUpdatedAt);
    });

    test("when marking a pending order as pre-transit, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.PENDING,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.markAsPreTransit()).toThrow(ValidationError);
    });

    test("when marking a pre-transit order as pre-transit, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.PRE_TRANSIT,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.markAsPreTransit()).toThrow(ValidationError);
    });

    test("when marking a shipping order as pre-transit, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.SHIPPING,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.markAsPreTransit()).toThrow(ValidationError);
    });

    test("when marking a delivered order as pre-transit, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.DELIVERED,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.markAsPreTransit()).toThrow(ValidationError);
    });

    test("when marking a returned order as pre-transit, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.RETURNED,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.markAsPreTransit()).toThrow(ValidationError);
    });

    test("when marking a suspended order as pre-transit, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.SUSPENDED,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.markAsPreTransit()).toThrow(ValidationError);
    });

    test("when marking a cancelled order as pre-transit, it should throw a ValidationError", () => {
      // Arrange
      const validArguments = makeValidReconstitueArguments({
        status: OrderStatus.CANCELLED,
      });

      const order = Order.reconstitute(...validArguments);

      // Act & Assert
      expect(() => order.markAsPreTransit()).toThrow(ValidationError);
    });
  });

  describe("Order.getTotalItemsPrice()", () => {
    test("when items have no discount, it should return the sum of the items prices", () => {
      // Arrange
      const items = [
        OrderItem.create(
          VariationId.generate(),
          1,
          Money.of(1000, "DZD"),
          Weight.of(100, "g"),
          null,
        ),

        OrderItem.create(
          VariationId.generate(),
          2,
          Money.of(2000, "DZD"),
          Weight.of(200, "g"),
          null,
        ),
      ];

      const validArguments = makeValidReconstitueArguments({
        orderItems: items,
      });

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getTotalItemsPrice()).toStrictEqual(Money.of(5000, "DZD"));
    });

    test("when items have discount, it should return the sum of the items discount price if exists, else the sum of the items prices", () => {
      // Arrange
      const items = [
        OrderItem.create(
          VariationId.generate(),
          1,
          Money.of(1000, "DZD"),
          Weight.of(100, "g"),
          null,
        ),
        OrderItem.create(
          VariationId.generate(),
          2,
          Money.of(2000, "DZD"),
          Weight.of(200, "g"),
          Money.of(1000, "DZD"),
        ),
      ];

      const validArguments = makeValidReconstitueArguments({
        orderItems: items,
      });

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getTotalItemsPrice()).toStrictEqual(Money.of(3000, "DZD"));
    });
  });

  describe("Order.getTotalOrderPrice()", () => {
    test("when order has valid arguments, it should return the sum of the items prices and the shipping price", () => {
      // Arrange
      const items = [
        OrderItem.create(
          VariationId.generate(),
          1,
          Money.of(1000, "DZD"),
          Weight.of(100, "g"),
          Money.of(900, "DZD"),
        ),
        OrderItem.create(
          VariationId.generate(),
          2,
          Money.of(2000, "DZD"),
          Weight.of(200, "g"),
          null,
        ),
      ];

      const validArguments = makeValidReconstitueArguments({
        orderItems: items,
        shippingPriceAtOrderTime: Money.of(500, "DZD"),
      });

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getTotalOrderPrice()).toStrictEqual(Money.of(5400, "DZD"));
    });
  });

  describe("Order.getTotalDiscount()", () => {
    test("when order items has no discount price, it should return 0", () => {
      // Arrange
      const items = [
        OrderItem.create(
          VariationId.generate(),
          1,
          Money.of(1000, "DZD"),
          Weight.of(100, "g"),
          null,
        ),
        OrderItem.create(
          VariationId.generate(),
          2,
          Money.of(2000, "DZD"),
          Weight.of(200, "g"),
          null,
        ),
      ];
      const validArguments = makeValidReconstitueArguments({
        orderItems: items,
      });

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getTotalDiscount()).toStrictEqual(Money.of(0, "DZD"));
    });

    test("when order items has discount price, it should return the sum of the discount prices", () => {
      // Arrange
      const items = [
        OrderItem.create(
          VariationId.generate(),
          1,
          Money.of(1000, "DZD"),
          Weight.of(100, "g"),
          null,
        ),
        OrderItem.create(
          VariationId.generate(),
          2,
          Money.of(2000, "DZD"),
          Weight.of(200, "g"),
          Money.of(1000, "DZD"),
        ),
      ];

      const validArguments = makeValidReconstitueArguments({
        orderItems: items,
      });

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getTotalDiscount()).toStrictEqual(Money.of(2000, "DZD"));
    });
  });

  describe("Order.getTotalWeightInGrams()", () => {
    test("when order has valid arguments, it should return the sum of the items weights in grams", () => {
      // Arrange
      const items = [
        OrderItem.create(
          VariationId.generate(),
          1,
          Money.of(1000, "DZD"),
          Weight.of(100, "g"),
          Money.of(900, "DZD"),
        ),
        OrderItem.create(
          VariationId.generate(),
          2,
          Money.of(2000, "DZD"),
          Weight.of(200, "g"),
          null,
        ),
      ];

      const validArguments = makeValidReconstitueArguments({
        orderItems: items,
      });

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getTotalWeightInGrams()).toStrictEqual(Weight.of(500, "g"));
    });
  });

  describe("Order.getTotalWeightInKg()", () => {
    test("when order has valid arguments, it should return the sum of the items weights in kg rounded to 2 decimals", () => {
      // Arrange
      const items = [
        OrderItem.create(
          VariationId.generate(),
          1,
          Money.of(1000, "DZD"),
          Weight.of(125, "g"),
          Money.of(900, "DZD"),
        ),
        OrderItem.create(
          VariationId.generate(),
          2,
          Money.of(2000, "DZD"),
          Weight.of(200, "g"),
          null,
        ),
      ];

      const validArguments = makeValidReconstitueArguments({
        orderItems: items,
      });

      // Act
      const order = Order.reconstitute(...validArguments);

      // Assert
      expect(order.getTotalWeightInKg()).toStrictEqual(Weight.of(0.53, "kg"));
    });
  });
});
