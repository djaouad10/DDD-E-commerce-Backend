import type { Container } from "#/composition/utils/container.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import {
  clearDatabase,
  createUserInDB,
  findIdempotencyKeyInDB,
  setupOrderInDB,
} from "#/tests/helpers/db-helpers.js";
import type { Mock } from "vitest";
import {
  DB,
  IDEMPOTENCY_KEYS_REPOSITORY,
  ORDER_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { CreateOrderInShippingProviderService } from "./create-order-in-shipping-provider.service.js";
import { CreateOrderInShippingProviderCommand } from "../../commands/outbox-handlers/create-order-in-shipping-provider.command.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { User } from "#/domain/entities/user.js";
import { OrderId } from "#/domain/value-objects/order-id.js";

describe("CreateOrderInShippingProviderService", () => {
  let container: Container;
  let service: CreateOrderInShippingProviderService;
  let shippingProviderGatewayMock: { createShipment: Mock };

  beforeAll(async () => {
    const testApp = await createTestApp();
    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
    const idempotencyRepo = container.resolveSingleton(
      IDEMPOTENCY_KEYS_REPOSITORY,
    );

    shippingProviderGatewayMock = {
      createShipment: vitest.fn(),
    };

    service = new CreateOrderInShippingProviderService(
      db,
      orderRepo,
      shippingProviderGatewayMock as any,
      idempotencyRepo,
    );
  });

  afterAll(async () => {
    cleanupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(container);
    // reset (not clear) so no test's implementation leaks into the next one
    shippingProviderGatewayMock.createShipment.mockReset();
    shippingProviderGatewayMock.createShipment.mockResolvedValue({
      trackingNumber: "TRACK-DEFAULT",
    });
  });

  async function createConfirmedOrder(): Promise<{
    orderId: string;
  }> {
    const user = User.create(
      "John",
      "john@example.com",
      "CLIENT",
      null,
      true,
      false,
    );
    await createUserInDB(container, user);

    const order = await setupOrderInDB(container, { owner: user });

    // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
    const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
    const orderFromDB = await orderRepo.find(order.id);

    orderFromDB!.confirm();
    await setupOrderInDB(container, { owner: user, order: orderFromDB! });

    return { orderId: order.id.value };
  }

  describe("Success Path", () => {
    test("when order exists and shipping provider creates shipment successfully, it should persist idempotency key and save tracking number", async () => {
      // Arrange
      const { orderId } = await createConfirmedOrder();
      shippingProviderGatewayMock.createShipment.mockResolvedValue({
        trackingNumber: "TRACK-12345",
      });

      const command = new CreateOrderInShippingProviderCommand(orderId);
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(shippingProviderGatewayMock.createShipment).toHaveBeenCalledTimes(
        1,
      );

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const persistedOrder = await orderRepo.find(OrderId.of(orderId));
      expect(persistedOrder).not.toBeNull();
      expect(persistedOrder!.getTrackingNumber()).toBe("TRACK-12345");

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("CreateOrderInShippingProviderService");
    });
  });

  describe("Error Handling", () => {
    test("when order does not exist, it should throw NotFoundError and never call the gateway", async () => {
      // Arrange
      const nonExistentOrderId = OrderId.generate().value;
      const command = new CreateOrderInShippingProviderCommand(
        nonExistentOrderId,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(shippingProviderGatewayMock.createShipment).not.toHaveBeenCalled();

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();
    });

    test("when shipping provider throws, it should propagate the error and NOT persist idempotency key", async () => {
      // Arrange
      const { orderId } = await createConfirmedOrder();
      const error = new Error("Shipping provider API down");
      shippingProviderGatewayMock.createShipment.mockRejectedValueOnce(error);

      const command = new CreateOrderInShippingProviderCommand(orderId);
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "Shipping provider API down",
      );

      // Critical: transaction must roll back so a retry can call createShipment again
      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const persistedOrder = await orderRepo.find(OrderId.of(orderId));
      expect(persistedOrder!.getTrackingNumber()).toBeNull();
    });
  });

  describe("Idempotency / duplicate-shipment protection", () => {
    test("when executed twice with the same jobId, the second attempt should throw ConflictError and NOT call the gateway again", async () => {
      // Arrange
      const { orderId } = await createConfirmedOrder();
      const command = new CreateOrderInShippingProviderCommand(orderId);
      const jobId = generateOutboxId();

      // Act - first execution succeeds
      await service.execute(command, jobId);

      // Assert - second execution with same jobId is rejected before hitting the gateway again
      await expect(service.execute(command, jobId)).rejects.toThrow(
        ConflictError,
      );

      expect(shippingProviderGatewayMock.createShipment).toHaveBeenCalledTimes(
        1,
      );
    });

    test("when the gateway succeeds but the post-commit save() step fails, a retry must NOT call createShipment again", async () => {
      // This is the core regression test for the fix: the idempotency key is
      // committed in the same transaction as createShipment, BEFORE save() runs.
      // So even if save() fails afterwards, a retry must be blocked by the
      // idempotency key rather than creating a second shipment at the provider.

      // Arrange
      const { orderId } = await createConfirmedOrder();
      const command = new CreateOrderInShippingProviderCommand(orderId);
      const jobId = generateOutboxId();

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const saveSpy = vitest
        .spyOn(orderRepo, "save")
        .mockRejectedValueOnce(new Error("DB write failed after shipment"));

      // Act - first attempt: gateway succeeds, save() fails
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "DB write failed after shipment",
      );

      expect(shippingProviderGatewayMock.createShipment).toHaveBeenCalledTimes(
        1,
      );

      // idempotency key should already be committed (transaction ended before save())
      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();

      saveSpy.mockRestore();

      // Act - retry with the SAME jobId
      await expect(service.execute(command, jobId)).rejects.toThrow(
        ConflictError,
      );

      // Assert - gateway must NOT have been called again (no duplicate shipment)
      expect(shippingProviderGatewayMock.createShipment).toHaveBeenCalledTimes(
        1,
      );
    });

    test("when executed with different jobIds for the same order, it should call the gateway both times (no cross-order idempotency assumed)", async () => {
      // Arrange
      const { orderId } = await createConfirmedOrder();
      const command = new CreateOrderInShippingProviderCommand(orderId);
      const jobId1 = generateOutboxId();
      const jobId2 = generateOutboxId();

      // Act
      await service.execute(command, jobId1);
      await service.execute(command, jobId2);

      // Assert
      expect(shippingProviderGatewayMock.createShipment).toHaveBeenCalledTimes(
        2,
      );

      const key1 = await findIdempotencyKeyInDB(container, jobId1);
      const key2 = await findIdempotencyKeyInDB(container, jobId2);
      expect(key1).not.toBeNull();
      expect(key2).not.toBeNull();
    });
  });
});
