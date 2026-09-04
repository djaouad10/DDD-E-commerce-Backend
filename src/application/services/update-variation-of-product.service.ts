import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { Weight } from "#/domain/value-objects/weight.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateVariationOfProductCommand } from "../commands/api/update-variation-of-product.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class UpdateVariationOfProductService {
  private logger = createLogger("UpdateVariationOfProductService");

  constructor(
    private db: DrizzleDBClient,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: UpdateVariationOfProductCommand): Promise<void> {
    this.logger.info("UpdateVariationOfProductService.execute called", {
      command,
    });

    const { productId, variationId, newTotalQty, newWeightInGrams } = command;

    const product = await this.productRepository.find(ProductId.of(productId));

    if (!product) throw new NotFoundError("product", productId);

    const variation = product.getVariation(VariationId.of(variationId));

    if (!variation) throw new NotFoundError("variation", variationId);

    if (newTotalQty !== undefined && variation.getTotalQty() !== newTotalQty)
      product.updateVariationTotalQty(VariationId.of(variationId), newTotalQty);

    if (
      newWeightInGrams !== undefined &&
      variation.getWeight().weight !== newWeightInGrams
    )
      product.updateVariationWeight(
        VariationId.of(variationId),
        Weight.of(newWeightInGrams, "g"),
      );

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
