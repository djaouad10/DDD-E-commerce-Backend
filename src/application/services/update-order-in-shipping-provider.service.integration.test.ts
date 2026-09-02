import type { Container } from "#/composition/container.js";
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
} from "#/composition/tokens.js";
import { UpdateOrderInShippingProviderService } from "./update-order-in-shipping-provider.service.js";
import { UpdateOrderInShippingProviderCommand } from "../commands/update-order-in-shipping-provider.command.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import {
  ConflictError,
  GatewayError,
  NotFoundError,
} from "#/shared/errors/domain-error.js";
import { User } from "#/domain/entities/user.js";
import { OrderId } from "#/domain/value-objects/order-id.js";

describe("UpdateOrderInShippingProviderService", () => {
  let container: Container;
  let service: UpdateOrderInShippingProviderService;
  let shippingProviderGatewayMock: { updateUnShippedShipment: Mock };

  beforeAll(async () => {
    const testApp = createTestApp();
    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
    const idempotencyRepo = container.resolveSingleton(
      IDEMPOTENCY_KEYS_REPOSITORY,
    );

    // Make sure the mock method name EXACTLY matches what the service calls
    shippingProviderGatewayMock = {
      updateUnShippedShipment: vitest
        .fn()
        .mockImplementation(() => ({ success: true })),
    };

    service = new UpdateOrderInShippingProviderService(
      db,
      shippingProviderGatewayMock as any,
      orderRepo,
      idempotencyRepo,
    );
  });

  afterAll(async () => {
    cleanupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(container);
    shippingProviderGatewayMock.updateUnShippedShipment.mockReset();
    shippingProviderGatewayMock.updateUnShippedShipment.mockResolvedValue({
      success: true,
    });
  });

  describe("Success Path", () => {
    test("when order exists and shipping provider successfully updates shipment, it should persist idempotency key", async () => {
      // Arrange
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

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      order.pullEvents(); // since the service reconstructs the order clean from DB with no in memory events stored

      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledWith(order);

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("UpdateOrderInShippingProviderService");
    });

    test("when shipping provider returns success: true, it should complete successfully", async () => {
      // Arrange
      shippingProviderGatewayMock.updateUnShippedShipment.mockResolvedValue({
        success: true,
      });

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

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
    });
  });

  describe("Idempotency", () => {
    test("when executed twice with same jobId, second attempt should throw ConflictError", async () => {
      // Arrange
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

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId = generateOutboxId();

      // Act - First execution
      await service.execute(command, jobId);

      // Assert - Second execution throws
      await expect(service.execute(command, jobId)).rejects.toThrow(
        ConflictError,
      );

      // Gateway should only be called once (first execution)
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when executed with different jobId for same order, it should execute both times", async () => {
      // Arrange
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

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId1 = generateOutboxId();
      const jobId2 = generateOutboxId();

      // Act
      await service.execute(command, jobId1);
      await service.execute(command, jobId2);

      // Assert
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(2);

      const key1 = await findIdempotencyKeyInDB(container, jobId1);
      const key2 = await findIdempotencyKeyInDB(container, jobId2);
      expect(key1).not.toBeNull();
      expect(key2).not.toBeNull();
    });
  });

  describe("Error Handling", () => {
    test("when order does not exist, it should throw NotFoundError", async () => {
      // Arrange
      const nonExistentOrderId = OrderId.generate().value;
      const command = new UpdateOrderInShippingProviderCommand(
        nonExistentOrderId,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).not.toHaveBeenCalled();

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();
    });

    test("when shipping provider returns success: false, it should throw GatewayError", async () => {
      // Arrange
      shippingProviderGatewayMock.updateUnShippedShipment.mockResolvedValue({
        success: false,
      });

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

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        GatewayError,
      );

      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when shipping provider throws an error, it should propagate the error", async () => {
      // Arrange
      const error = new Error("Shipping provider API down");
      shippingProviderGatewayMock.updateUnShippedShipment.mockRejectedValue(
        error,
      );

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

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "Shipping provider API down",
      );

      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("Transaction Safety", () => {
    test("when gateway throws, it should rollback and NOT persist idempotency key", async () => {
      // Arrange
      shippingProviderGatewayMock.updateUnShippedShipment.mockRejectedValueOnce(
        new Error("Network timeout"),
      );

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

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "Network timeout",
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull(); // Critical: no key persisted so retry can succeed
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when gateway returns success: false, it should rollback and NOT persist idempotency key", async () => {
      // Arrange
      shippingProviderGatewayMock.updateUnShippedShipment.mockResolvedValueOnce(
        {
          success: false,
        },
      );

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

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        GatewayError,
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull(); // No key persisted since transaction rolled back
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when order not found, it should NOT call gateway and NOT persist idempotency key", async () => {
      // Arrange
      const nonExistentOrderId = OrderId.generate().value;
      const command = new UpdateOrderInShippingProviderCommand(
        nonExistentOrderId,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Order State", () => {
    test("should update order with different statuses", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Create order in CONFIRMED state
      const order = await setupOrderInDB(container, { owner: user });
      order.confirm();
      await setupOrderInDB(container, { owner: user, order });

      const command = new UpdateOrderInShippingProviderCommand(order.id.value);
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert

      order.pullEvents(); // since the service reconstructs the order clean from DB with no in memory events stored

      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledWith(order);
      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
    });
  });
});
