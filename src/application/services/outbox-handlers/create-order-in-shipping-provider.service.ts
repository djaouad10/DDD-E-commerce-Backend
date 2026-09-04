import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CreateOrderInShippingProviderCommand } from "../../commands/outbox-handlers/create-order-in-shipping-provider.command.js";
import type { IdempotencyKeysRepository } from "../../ports/persistence/idempotency-keys.repository.port.js";

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
        this.logger.debug("Order not found", { orderId });
        throw new NotFoundError("order", orderId.value);
      }

      const trackingNumber = await this.db.transaction(async (tx) => {
        // create idempotency key first with this jobId to make sure it wasn't successfully processed before
        await this.idempotencyKeysRepository.create(
          jobId,
          "CreateOrderInShippingProviderService",
          tx,
        );

        // must be made inside the transaction that creates the idempotency key
        const { trackingNumber } =
          await this.shippingProviderGateway.createShipment(order); // we should also send idempotency key to the shipping provider if he supports it, in case our connection timeoud out but the request was successfully processed by the shipping provider
        // but my current shipping provider doesn't support idempotency keys

        // what if API call succeeds but order.trackingNumber update fails?
        // in this case we have a cron reconsilation worker, it fetches orders with a trackingNumber of null and a CONFIRMED status, and fetches their tracking numbers from the shipping provider (if their API supports lookup-by-external-reference) and updates them in DB.
        return trackingNumber;
      });

      order.setTrackingNumber(trackingNumber);

      await this.orderRepository.save(order); // shouldn't be inside the transaction, so that the idempotency key is created successfully whenever the shipment creation succeeds, we don't want the transaction to be rolled back at the save() method after the shipping provider already saved the order, this will cause the order to be created more than once at shipping provider
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
