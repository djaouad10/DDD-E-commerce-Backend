import { buildUnitTestsContainer } from "#/composition/tests/unit-test-composition.js";
import {
  DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
  IDEMPOTENCY_KEYS_REPOSITORY,
  SHIPPING_PROVIDER_GATEWAY,
} from "#/composition/tokens.js";
import { InMemoryIdempotencyKeysRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-idempotency-keys-repository.js";
import { InMemoryShippingProviderGateway } from "#/infrastructure/gateways/in-memory-shipping-provider-gateway.js";
import { DeleteOrderFromShippingProviderCommand } from "../commands/delete-order-from-shipping-provider.command.js";
import { ConflictError, GatewayError } from "#/shared/errors/domain-error.js";

describe("DeleteOrderFromShippingProviderService", () => {
  function setup() {
    const container = buildUnitTestsContainer();
    const scope = container.createScope();
    const service = scope.resolve(DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE);
    const idempotencyRepo = scope.resolve(
      IDEMPOTENCY_KEYS_REPOSITORY,
    ) as InMemoryIdempotencyKeysRepository;
    const gateway = scope.resolve(
      SHIPPING_PROVIDER_GATEWAY,
    ) as InMemoryShippingProviderGateway;

    return { container, scope, service, idempotencyRepo, gateway };
  }

  test("when shipment exists and it's first time being processed, it should delete shipment and store idempotency key", async () => {
    // Arrange
    const { service, idempotencyRepo, gateway } = setup();

    // Seed a shipment in the gateway so delete returns success=true
    const trackingNumber = "WE000001";
    gateway.seedShipment(trackingNumber, "SHIPPING");

    const command = new DeleteOrderFromShippingProviderCommand(
      trackingNumber,
      "WORLD_EXPRESS",
    );
    const jobId = "otbx_delete_123";

    // Act
    await service.execute(command, jobId);

    // Assert
    expect(idempotencyRepo.hasKey(jobId)).toBe(true);
    expect(idempotencyRepo.getKey(jobId)?.handlerName).toBe(
      "DeleteOrderFromShippingProviderService",
    );
    expect(gateway.getShipment(trackingNumber)).toBeUndefined();
  });

  test("when gateway returns success=false, it should throw GatewayError", async () => {
    // Arrange
    const { service } = setup();

    // No shipment seeded → deleteUnshippedShipment returns { success: false }
    const command = new DeleteOrderFromShippingProviderCommand(
      "WE_NONEXISTENT",
      "WORLD_EXPRESS",
    );
    const jobId = "otbx_delete_456";

    // Act & Assert
    await expect(service.execute(command, jobId)).rejects.toThrow(GatewayError);

    // Transaction rolled back → idempotency key not stored
    // expect(idempotencyRepo.hasKey(jobId)).toBe(false);
  });

  test("when gateway call throws, it should re-throw error", async () => {
    // Arrange
    const { service, gateway } = setup();

    gateway.setFailure("deleteUnshippedShipment");

    const command = new DeleteOrderFromShippingProviderCommand(
      "WE000002",
      "WORLD_EXPRESS",
    );

    const jobId = "otbx_delete_789";

    // Act & Assert
    await expect(service.execute(command, jobId)).rejects.toThrow(
      "InMemoryShippingProviderGateway.deleteUnshippedShipment() failed",
    );
  });

  test("when job already processed, it should throw ConflictError (duplicate jobId)", async () => {
    // Arrange
    const { service, idempotencyRepo, gateway } = setup();

    const trackingNumber = "WE000003";
    gateway.seedShipment(trackingNumber, "SHIPPING");

    const command = new DeleteOrderFromShippingProviderCommand(
      trackingNumber,
      "WORLD_EXPRESS",
    );
    const jobId = "otbx_delete_abc";

    // Act — first call succeeds
    await service.execute(command, jobId);
    expect(idempotencyRepo.hasKey(jobId)).toBe(true);

    // Assert — second call with same jobId fails
    await expect(service.execute(command, jobId)).rejects.toThrow(
      ConflictError,
    );
  });

  test("when called, it should use the correct jobId as idempotency key", async () => {
    // Arrange
    const { service, idempotencyRepo, gateway } = setup();

    const trackingNumber = "WE000004";
    gateway.seedShipment(trackingNumber, "SHIPPING");

    const command = new DeleteOrderFromShippingProviderCommand(
      trackingNumber,
      "WORLD_EXPRESS",
    );
    const jobId = "otbx_delete_def456";

    // Act
    await service.execute(command, jobId);

    // Assert
    expect(idempotencyRepo.hasKey("otbx_delete_def456")).toBe(true);
    expect(idempotencyRepo.hasKey("wrong-id")).toBe(false);
  });
});
