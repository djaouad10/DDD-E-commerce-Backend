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
import { ActivateShipmentInShippingProviderService } from "./activate-shipment-in-shipping-provider.service.js";
import { ActivateShipmentInShippingProviderCommand } from "../commands/activate-shipment-in-shipping-provider.command.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import {
  ConflictError,
  GatewayError,
  NotFoundError,
} from "#/shared/errors/domain-error.js";
import { User } from "#/domain/entities/user.js";

describe("ActivateShipmentInShippingProviderService", () => {
  let container: Container;
  let service: ActivateShipmentInShippingProviderService;
  let shippingProviderGatewayMock: { activateShipment: Mock };

  beforeAll(async () => {
    const testApp = createTestApp();
    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
    const idempotencyRepo = container.resolveSingleton(
      IDEMPOTENCY_KEYS_REPOSITORY,
    );

    // Mock external gateway, never call real shipping provider APIs in tests
    shippingProviderGatewayMock = {
      activateShipment: vitest.fn().mockResolvedValue({ success: true }),
    };

    service = new ActivateShipmentInShippingProviderService(
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
    shippingProviderGatewayMock.activateShipment.mockReset();
    shippingProviderGatewayMock.activateShipment.mockResolvedValue({
      success: true,
    });
  });

  describe("Success Path", () => {
    test("when order exists and shipping provider successfully activates shipment, it should persist idempotency key", async () => {
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      // Add tracking number to the order
      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(
        shippingProviderGatewayMock.activateShipment,
      ).toHaveBeenCalledTimes(1);
      expect(shippingProviderGatewayMock.activateShipment).toHaveBeenCalledWith(
        trackingNumber,
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe(
        "ActivateShipmentInShippingProviderService",
      );
    });

    test("when shipping provider returns success: true, it should complete successfully", async () => {
      // Arrange
      shippingProviderGatewayMock.activateShipment.mockResolvedValue({
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      const trackingNumber = "TRACK789";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(
        shippingProviderGatewayMock.activateShipment,
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act - First execution
      await service.execute(command, jobId);

      // Assert - Second execution throws
      await expect(service.execute(command, jobId)).rejects.toThrow(
        ConflictError,
      );

      // Gateway should only be called once (first execution)
      expect(
        shippingProviderGatewayMock.activateShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when executed with different jobId for same tracking number, it should execute both times", async () => {
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId1 = generateOutboxId();
      const jobId2 = generateOutboxId();

      // Act
      await service.execute(command, jobId1);
      await service.execute(command, jobId2);

      // Assert
      expect(
        shippingProviderGatewayMock.activateShipment,
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
      const trackingNumber = "NONEXISTENT";
      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(
        shippingProviderGatewayMock.activateShipment,
      ).not.toHaveBeenCalled();

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();
    });

    test("when shipping provider returns success: false, it should throw GatewayError", async () => {
      // Arrange
      shippingProviderGatewayMock.activateShipment.mockResolvedValue({
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        GatewayError,
      );

      expect(
        shippingProviderGatewayMock.activateShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when shipping provider throws an error, it should propagate the error", async () => {
      // Arrange
      const error = new Error("Shipping provider API down");
      shippingProviderGatewayMock.activateShipment.mockRejectedValue(error);

      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "Shipping provider API down",
      );

      expect(
        shippingProviderGatewayMock.activateShipment,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("Transaction Safety", () => {
    test("when gateway throws, it should rollback and NOT persist idempotency key", async () => {
      // Arrange
      shippingProviderGatewayMock.activateShipment.mockRejectedValueOnce(
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "Network timeout",
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull(); // Critical: no key persisted so retry can succeed
      expect(
        shippingProviderGatewayMock.activateShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when gateway returns success: false, it should rollback and NOT persist idempotency key", async () => {
      // Arrange
      shippingProviderGatewayMock.activateShipment.mockResolvedValueOnce({
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        GatewayError,
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull(); // No key persisted since transaction rolled back
      expect(
        shippingProviderGatewayMock.activateShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when order not found, it should NOT call gateway and NOT persist idempotency key", async () => {
      // Arrange
      const trackingNumber = "NONEXISTENT";
      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();
      expect(
        shippingProviderGatewayMock.activateShipment,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Order State", () => {
    test("should activate shipment for order in confirmed state", async () => {
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();

      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );

      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(shippingProviderGatewayMock.activateShipment).toHaveBeenCalledWith(
        trackingNumber,
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
    });

    test("should activate shipment for order with multiple items", async () => {
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

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      const trackingNumber = "TRACK123456";
      orderFromDB!.setTrackingNumber(trackingNumber);
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new ActivateShipmentInShippingProviderCommand(
        trackingNumber,
      );
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(shippingProviderGatewayMock.activateShipment).toHaveBeenCalledWith(
        trackingNumber,
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
    });
  });
});
