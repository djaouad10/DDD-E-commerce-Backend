import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { GatewayError, NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateOrderInShippingProviderCommand } from "../../commands/outbox-handlers/update-order-in-shipping-provider.command.js";
import type { IdempotencyKeysRepository } from "../../ports/persistence/idempotency-keys.repository.port.js";

export class UpdateOrderInShippingProviderService {
  private logger = createLogger("UpdateOrderInShippingProviderService");

  constructor(
    private db: DrizzleDBClient,
    private shippingProviderGateway: ShippingProviderGateway,
    private orderRepository: OrderRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: UpdateOrderInShippingProviderCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("Updating order in shipping provider", {
      jobId,
      orderId: command.orderId,
    });

    await this.db.transaction(async (tx) => {
      // create idempotency key first with this jobId to make sure it wasn't successfully processed before
      await this.idempotencyKeysRepository.create(
        jobId,
        "UpdateOrderInShippingProviderService",
        tx,
      );

      const order = await this.orderRepository.find(
        OrderId.of(command.orderId),
        tx,
      );

      if (!order) throw new NotFoundError("order", command.orderId);

      const { success } =
        await this.shippingProviderGateway.updateUnShippedShipment(order);

      if (!success)
        throw new GatewayError(
          "shippingProviderGateway",
          new Error("Failed to update order in shipping provider"),
        );
    });
  }
}
