import type { Container } from "#/composition/container.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import {
  clearDatabase,
  findIdempotencyKeyInDB,
} from "#/tests/helpers/db-helpers.js";
import type { Mock } from "vitest";
import { DB, IDEMPOTENCY_KEYS_REPOSITORY } from "#/composition/tokens.js";
import { DeleteOrderFromShippingProviderService } from "./delete-order-from-shipping-provider.service.js";
import { DeleteOrderFromShippingProviderCommand } from "../commands/outbox-handlers/delete-order-from-shipping-provider.command.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError, GatewayError } from "#/shared/errors/domain-error.js";
import { ShippingProvider } from "#/domain/entities/order.js";

describe("DeleteOrderFromShippingProviderService", () => {
  let container: Container;
  let service: DeleteOrderFromShippingProviderService;
  let shippingProviderGatewayMock: { deleteUnshippedShipment: Mock };

  beforeAll(async () => {
    const testApp = createTestApp();
    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const idempotencyRepo = container.resolveSingleton(
      IDEMPOTENCY_KEYS_REPOSITORY,
    );

    // Mock external gateway, never call real shipping provider APIs in tests
    shippingProviderGatewayMock = {
      deleteUnshippedShipment: vitest.fn().mockResolvedValue({ success: true }),
    };

    service = new DeleteOrderFromShippingProviderService(
      db,
      shippingProviderGatewayMock as any,
      idempotencyRepo,
    );
  });

  afterAll(async () => {
    cleanupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(container);
    shippingProviderGatewayMock.deleteUnshippedShipment.mockClear();
  });

  describe("Success Path", () => {
    test("when shipping provider successfully deletes shipment, it should persist idempotency key", async () => {
      // Arrange
      const command = new DeleteOrderFromShippingProviderCommand(
        "TRACK123456",
        ShippingProvider.WORLD_EXPRESS,
      );
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledTimes(1);
      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledWith("TRACK123456");

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("DeleteOrderFromShippingProviderService");
    });

    test("when shipping provider returns success: true, it should complete successfully", async () => {
      // Arrange
      shippingProviderGatewayMock.deleteUnshippedShipment.mockResolvedValue({
        success: true,
      });

      const command = new DeleteOrderFromShippingProviderCommand(
        "TRACK789",
        ShippingProvider.WORLD_EXPRESS,
      );
      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledTimes(1);

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
    });
  });

  describe("Idempotency", () => {
    test("when executed twice with same jobId, second attempt should throw ConflictError", async () => {
      // Arrange
      const command = new DeleteOrderFromShippingProviderCommand(
        "TRACK123456",
        ShippingProvider.WORLD_EXPRESS,
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
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when executed with different jobId for same tracking number, it should execute both times", async () => {
      // Arrange
      const command = new DeleteOrderFromShippingProviderCommand(
        "TRACK123456",
        ShippingProvider.WORLD_EXPRESS,
      );
      const jobId1 = generateOutboxId();
      const jobId2 = generateOutboxId();

      // Act
      await service.execute(command, jobId1);
      await service.execute(command, jobId2);

      // Assert
      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledTimes(2);

      const key1 = await findIdempotencyKeyInDB(container, jobId1);
      const key2 = await findIdempotencyKeyInDB(container, jobId2);
      expect(key1).not.toBeNull();
      expect(key2).not.toBeNull();
    });
  });

  describe("Error Handling", () => {
    test("when shipping provider returns success: false, it should throw GatewayError", async () => {
      // Arrange
      shippingProviderGatewayMock.deleteUnshippedShipment.mockResolvedValue({
        success: false,
      });

      const command = new DeleteOrderFromShippingProviderCommand(
        "TRACK123456",
        ShippingProvider.WORLD_EXPRESS,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        GatewayError,
      );

      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when shipping provider throws an error, it should propagate the error", async () => {
      // Arrange
      const error = new Error("Shipping provider API down");
      shippingProviderGatewayMock.deleteUnshippedShipment.mockRejectedValue(
        error,
      );

      const command = new DeleteOrderFromShippingProviderCommand(
        "TRACK123456",
        ShippingProvider.WORLD_EXPRESS,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "Shipping provider API down",
      );

      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("Transaction Safety", () => {
    test("when gateway throws, it should rollback and NOT persist idempotency key", async () => {
      // Arrange
      shippingProviderGatewayMock.deleteUnshippedShipment.mockRejectedValueOnce(
        new Error("Network timeout"),
      );

      const command = new DeleteOrderFromShippingProviderCommand(
        "TRACK123456",
        ShippingProvider.WORLD_EXPRESS,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "Network timeout",
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull(); // Critical: no key persisted so retry can succeed
      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledTimes(1);
    });

    test("when gateway returns success: false, it should rollback and NOT persist idempotency key", async () => {
      // Arrange
      shippingProviderGatewayMock.deleteUnshippedShipment.mockResolvedValueOnce(
        {
          success: false,
        },
      );

      const command = new DeleteOrderFromShippingProviderCommand(
        "TRACK123456",
        ShippingProvider.WORLD_EXPRESS,
      );
      const jobId = generateOutboxId();

      // Act & Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        GatewayError,
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull(); // No key persisted since transaction rolled back
      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
