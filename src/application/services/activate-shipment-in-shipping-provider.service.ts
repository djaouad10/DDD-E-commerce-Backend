import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { GatewayError, NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { ActivateShipmentInShippingProviderCommand } from "../commands/outbox-handlers/activate-shipment-in-shipping-provider.command.js";
import type { IdempotencyKeysRepository } from "../repositories/idempotency-keys.repository.js";

export class ActivateShipmentInShippingProviderService {
  private logger = createLogger("ActivateShipmentInShippingProviderService");

  constructor(
    private db: DrizzleDBClient,
    private shippingProviderGateway: ShippingProviderGateway,
    private orderRepository: OrderRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: ActivateShipmentInShippingProviderCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("Activating shipment in shipping provider", {
      jobId,
      trackingNumber: command.trackingNumber,
    });

    await this.db.transaction(async (tx) => {
      // create idempotency key first with this jobId to make sure it wasn't successfully processed before
      await this.idempotencyKeysRepository.create(
        jobId,
        "ActivateShipmentInShippingProviderService",
        tx,
      );

      const order = await this.orderRepository.findByTracking(
        command.trackingNumber,
        tx,
      );

      if (!order) throw new NotFoundError("order", command.trackingNumber);

      const { success } = await this.shippingProviderGateway.activateShipment(
        command.trackingNumber,
      );

      if (!success)
        throw new GatewayError(
          "shippingProviderGateway",
          new Error("Failed to activate shipment in shipping provider"),
        );
    });
  }
}
