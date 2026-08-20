import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { CategoryId } from "#/domain/value-objects/category-id.js";
import { Money } from "#/domain/value-objects/money.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateProductCommand } from "../commands/update-product.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class UpdateProductService {
  private logger = createLogger("UpdateProductService");

  constructor(
    private db: DrizzleDBClient,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: UpdateProductCommand): Promise<void> {
    this.logger.info("UpdateProductService.execute called", { command });

    const { productId, data } = command;

    const product = await this.productRepository.find(ProductId.of(productId));

    if (!product) throw new NotFoundError("product", productId);

    if (data.name !== undefined) {
      product.updateName(data.name);
    }

    if (data.description !== undefined) {
      product.updateDescription(data.description);
    }

    if (data.brand !== undefined) {
      product.updateBrand(data.brand);
    }

    if (data.material !== undefined) {
      product.updateMaterial(data.material);
    }

    if (data.price !== undefined) {
      product.updatePrice(Money.of(data.price, product.getPrice().currency));
    }

    if (data.discountPrice !== undefined) {
      product.updateDiscountedPrice(
        data.discountPrice
          ? Money.of(data.discountPrice, product.getPrice().currency)
          : null,
      );
    }

    if (data.categoryId !== undefined) {
      product.updateCategory(
        data.categoryId ? CategoryId.of(data.categoryId) : null,
      );
    }

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
