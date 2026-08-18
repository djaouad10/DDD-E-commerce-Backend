import { Variation } from "#/domain/entities/variation.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { Weight } from "#/domain/value-objects/weight.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CreateVariationOfProductCommand } from "../commands/create-variation-of-product.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class CreateVariationOfProductService {
  private logger = createLogger("CreateVariationOfProductService");

  constructor(
    private db: DrizzleDBClient,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: CreateVariationOfProductCommand): Promise<void> {
    this.logger.info("CreateVariationOfProductService.execute called", {
      ...command,
    });

    const {
      productId,
      data: { color, size, totalQty, weightInGrams },
    } = command;

    const product = await this.productRepository.find(ProductId.of(productId));

    if (!product) throw new NotFoundError("product", productId);

    const newVariation = Variation.create(
      size,
      color,
      totalQty,
      0,
      Weight.of(weightInGrams, "g"),
    );

    product.addVariation(newVariation);

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
