import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { GatewayError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DeleteOrderFromShippingProviderCommand } from "../../commands/outbox-handlers/delete-order-from-shipping-provider.command.js";
import type { IdempotencyKeysRepository } from "../../ports/persistence/idempotency-keys.repository.port.js";

export class DeleteOrderFromShippingProviderService {
  private logger = createLogger("DeleteOrderFromShippingProviderService");

  constructor(
    private db: DrizzleDBClient,
    private shippingProviderGateway: ShippingProviderGateway,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: DeleteOrderFromShippingProviderCommand,
    jobId: string,
  ) {
    this.logger.info("Deleting order from shipping provider", {
      jobId,
      trackingNumber: command.trackingNumber,
      shippingProvider: command.shippingProvider,
    });

    try {
      await this.db.transaction(async (tx) => {
        // create idempotency key first with this jobId to make sure it wasn't successfully processed before
        await this.idempotencyKeysRepository.create(
          jobId,
          "DeleteOrderFromShippingProviderService",
          tx,
        );

        const { success } =
          await this.shippingProviderGateway.deleteUnshippedShipment(
            command.trackingNumber,
          );

        if (!success)
          throw new GatewayError(
            "shippingProviderGateway",
            new Error("Failed to delete order from shipping provider"),
          );
      });
    } catch (error) {
      this.logger.error(
        "Error deleting order from shipping provider",
        error as Error,
        {
          jobId,
          trackingNumber: command.trackingNumber,
          shippingProvider: command.shippingProvider,
        },
      );

      // throw so worker knows the job failed
      throw error;
    }
  }
}
