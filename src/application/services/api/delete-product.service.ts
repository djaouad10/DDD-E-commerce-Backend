import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DeleteProductCommand } from "../../commands/api/delete-product.command.js";
import type { OrderQueries } from "../../read-models/order.queries.js";
import type { OutboxRepository } from "../../ports/persistence/outbox.repository.port.js";
import type { DBClient } from "#/shared/types/db-client.js";

export class DeleteProductService {
  private logger = createLogger("DeleteProductService");

  constructor(
    private db: DBClient,
    private productRepository: ProductRepository,
    private orderQueries: OrderQueries,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    this.logger.info("DeleteProductService.execute called", { command });

    const productId = ProductId.of(command.productId);

    const product = await this.productRepository.find(productId);

    if (!product) throw new NotFoundError("product", command.productId);

    const existingOrderWithItemOfProduct =
      await this.orderQueries.getFirstOrderWithItemOfProduct(productId);

    if (existingOrderWithItemOfProduct) {
      throw new ConflictError(
        "product",
        command.productId,
        "there's at least one order with an item referencing this product",
      );
    }

    const events = product.pullEvents();

    this.logger.debug("Saving product", { id: product.id.value });

    await this.db.transaction(async (tx) => {
      await this.productRepository.delete(productId, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        await this.outboxRepository.saveEvents(events, tx);
      }
    });
  }
}
