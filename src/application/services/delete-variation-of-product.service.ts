import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DeleteVariationOfProductCommand } from "../commands/delete-variation-of-product.command.js";
import type { OrderQueries } from "../read-models/order.queries.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class DeleteVariationOfProductService {
  private logger = createLogger("DeleteVariationOfProductService");

  constructor(
    private db: DrizzleDBClient,
    private productRepository: ProductRepository,
    private orderQueries: OrderQueries,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: DeleteVariationOfProductCommand): Promise<void> {
    this.logger.info("DeleteVariationOfProductService.execute called", {
      command,
    });

    const productId = ProductId.of(command.productId);
    const variationId = VariationId.of(command.variationId);

    const product = await this.productRepository.find(productId);

    if (!product) throw new NotFoundError("product", command.productId);

    const variation = product.getVariation(variationId);

    if (!variation) throw new NotFoundError("variation", command.variationId);

    const existingOrderWithItemOfVariation =
      await this.orderQueries.getFirstOrderWithItemOfVariation(variationId);

    if (existingOrderWithItemOfVariation) {
      throw new ConflictError(
        "variation",
        command.variationId,
        "there's at least one order with an item referencing this variation",
      );
    }

    product.removeVariation(variationId);

    const events = product.pullEvents();

    this.logger.debug("Saving product", { id: product.id.value });

    await this.db.transaction(async (tx) => {
      await this.productRepository.save(product, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        await this.outboxRepository.saveEvents(events, tx);
      }
    });
  }
}
