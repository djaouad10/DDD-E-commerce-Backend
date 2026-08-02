import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CreateOrderInShippingProviderCommand } from "../commands/create-order-in-shipping-provider.command.js";
import type { IdempotencyKeysRepository } from "../repositories/idempotency-keys.repository.js";

export class CreateOrderInShippingProviderService {
  private logger = createLogger("CreateOrderInShippingProviderService");

  constructor(
    private db: DrizzleDBClient,
    private orderRepository: OrderRepository,
    private shippingProviderGateway: ShippingProviderGateway,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(command: CreateOrderInShippingProviderCommand, jobId: string) {
    this.logger.info("Creating order in shipping provider", {
      jobId,
      orderId: command.orderId,
    });

    try {
      const orderId = OrderId.of(command.orderId);
      const order = await this.orderRepository.find(orderId);

      if (!order) {
        this.logger.error(
          "Order not found",
          new NotFoundError("Order", orderId.value),
          {
            orderId: orderId.value,
          },
        );

        // return so worker knows the job succeeded, since there's nothing to process
        return;
      }

      await this.db.transaction(async (tx) => {
        // create idempotency key first with this jobId to make sure it wasn't successfully processed before
        await this.idempotencyKeysRepository.create(
          jobId,
          "CreateOrderInShippingProviderService",
          tx,
        );

        const { trackingNumber } =
          await this.shippingProviderGateway.createShipment(order);

        // what if API call succeeds but order.trackingNumber update fails?
        // in this case we have a reconsilation logic when fetching a single order, if the trackingNumber of a CONFIRMED order is null, we fetch it from the shipping provider and reconcile
        order.setTrackingNumber(trackingNumber);

        await this.orderRepository.save(order, tx);
      });
    } catch (error) {
      this.logger.error(
        "Failed to create order in shipping provider",
        error as Error,
        {
          jobId,
          orderId: command.orderId,
        },
      );

      // after logging, re-throw so the underlying worker knows the job failed
      throw error;
    }
  }
}
