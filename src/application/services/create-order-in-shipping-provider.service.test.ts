import { buildUnitTestsContainer } from "#/composition/tests/unit-test-composition.js";
import {
  CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
  ORDER_REPOSITORY,
  IDEMPOTENCY_KEYS_REPOSITORY,
  SHIPPING_PROVIDER_GATEWAY,
} from "#/composition/tokens.js";
import type { InMemoryOrderRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-order-repository.js";
import { InMemoryIdempotencyKeysRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-idempotency-keys-repository.js";
import { InMemoryShippingProviderGateway } from "#/infrastructure/gateways/in-memory-shipping-provider-gateway.js";
import { CreateOrderInShippingProviderCommand } from "../commands/create-order-in-shipping-provider.command.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { ConflictError } from "#/shared/errors/domain-error.js";
import { Order } from "#/domain/entities/order.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { faker } from "@faker-js/faker";
import { Money } from "#/domain/value-objects/money.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { ShippingDetails } from "#/domain/value-objects/shipping-details.js";
import { UserId } from "#/domain/value-objects/user-id.js";

function createTestOrder(orderId: OrderId): Order {
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

  return Order.reconstitute(
    orderId,
    UserId.generate(),
    null,
    "PENDING",
    null,
    Money.of(400, "DZD"),
    "WORLD_EXPRESS",
    makeValidShippingDetails(),
    makeValidOrderItems(),
    new Date(),
    new Date(),
  );
}

describe("CreateOrderInShippingProviderService", () => {
  function setup() {
    const container = buildUnitTestsContainer();
    const scope = container.createScope();
    const service = scope.resolve(CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE);
    const orderRepo = scope.resolve(
      ORDER_REPOSITORY,
    ) as InMemoryOrderRepository;
    const idempotencyRepo = scope.resolve(
      IDEMPOTENCY_KEYS_REPOSITORY,
    ) as InMemoryIdempotencyKeysRepository;
    const gateway = scope.resolve(
      SHIPPING_PROVIDER_GATEWAY,
    ) as InMemoryShippingProviderGateway;

    return { container, scope, service, orderRepo, idempotencyRepo, gateway };
  }

  test("when order found and it's first time being processed, it should create shipment, set tracking number, save order and store idempotency key", async () => {
    // Arrange
    const { service, orderRepo, idempotencyRepo, gateway } = setup();

    const orderId = OrderId.generate();
    const order = createTestOrder(orderId);
    await orderRepo.save(order, {} as any);

    const command = new CreateOrderInShippingProviderCommand(orderId.value);
    const jobId = "otbx_job_123";

    // Act
    await service.execute(command, jobId);

    // Assert
    // Order was saved with tracking number
    const savedOrder = await orderRepo.find(orderId);
    expect(savedOrder).not.toBeNull();
    expect(savedOrder!.getTrackingNumber()).toMatch(/^WE\d{6}$/);

    // Idempotency key was stored
    expect(idempotencyRepo.hasKey(jobId)).toBe(true);
    expect(idempotencyRepo.getKey(jobId)?.handlerName).toBe(
      "CreateOrderInShippingProviderService",
    );

    // Gateway has the shipment
    expect(gateway.getAllShipments()).toHaveLength(1);
  });

  test("when order not found, it should return early and worker treats it as success", async () => {
    // Arrange
    const { service, idempotencyRepo, gateway } = setup();

    const orderId = OrderId.generate();
    const command = new CreateOrderInShippingProviderCommand(orderId.value);
    const jobId = "otbx_job_456";

    // Act
    // Should not throw
    const result = await service.execute(command, jobId);

    // Returns undefined (void)
    expect(result).toBeUndefined();

    // No idempotency key created
    expect(idempotencyRepo.hasKey(jobId)).toBe(false);

    // No gateway call made
    expect(gateway.getAllShipments()).toHaveLength(0);
  });

  test("when job already processed, it should throw ConflictError (duplicate jobId)", async () => {
    // Arrange
    const { service, orderRepo, idempotencyRepo } = setup();

    const orderId = OrderId.generate();
    const order = createTestOrder(orderId);
    await orderRepo.save(order, {} as any);

    const command = new CreateOrderInShippingProviderCommand(orderId.value);
    const jobId = "otbx_job_789";

    // Act
    // First call succeeds
    await service.execute(command, jobId);

    // Assert
    expect(idempotencyRepo.hasKey(jobId)).toBe(true);

    // Act & Assert
    // Second call with same jobId fails
    await expect(service.execute(command, jobId)).rejects.toThrow(
      ConflictError,
    );
  });

  test("when gateway call throws, it should re-throw gateway error and does not save order", async () => {
    // Arrange
    const { service, orderRepo, gateway } = setup();

    const orderId = OrderId.generate();
    const order = createTestOrder(orderId);
    await orderRepo.save(order, {} as any);

    // Make gateway fail
    gateway.setFailure("createShipment");

    const command = new CreateOrderInShippingProviderCommand(orderId.value);
    const jobId = "otbx_job_999";

    // Act & Assert
    await expect(service.execute(command, jobId)).rejects.toThrow(
      "InMemoryShippingProviderGateway.createShipment() failed",
    );

    // Order still has no tracking number (save was never reached)
    const savedOrder = await orderRepo.find(orderId);
    expect(savedOrder!.getTrackingNumber()).toBeNull();
  });

  test("when called, it should use the correct jobId as idempotency key", async () => {
    // Arrange
    const { service, orderRepo, idempotencyRepo } = setup();

    const orderId = OrderId.generate();
    const order = createTestOrder(orderId);
    await orderRepo.save(order, {} as any);

    const command = new CreateOrderInShippingProviderCommand(orderId.value);
    const jobId = "otbx_abc123def456";

    // Act
    await service.execute(command, jobId);

    // Assert
    // The outbox jobId becomes the idempotency key
    expect(idempotencyRepo.hasKey("otbx_abc123def456")).toBe(true);
    expect(idempotencyRepo.hasKey("wrong-id")).toBe(false);
  });
});
