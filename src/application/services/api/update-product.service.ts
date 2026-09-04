import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { CategoryId } from "#/domain/value-objects/category-id.js";
import { Money } from "#/domain/value-objects/money.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateProductCommand } from "../../commands/api/update-product.command.js";
import type { OutboxRepository } from "../../ports/persistence/outbox.repository.port.js";

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

    // we check that fields are actually updated or not to avoid recording unnecessary product updated events

    if (data.name !== undefined && data.name !== product.getName()) {
      product.updateName(data.name);
    }

    if (
      data.description !== undefined &&
      data.description !== product.getDescription()
    ) {
      product.updateDescription(data.description);
    }

    if (data.brand !== undefined && data.brand !== product.getBrand()) {
      product.updateBrand(data.brand);
    }

    if (
      data.material !== undefined &&
      data.material !== product.getMaterial()
    ) {
      product.updateMaterial(data.material);
    }

    if (data.price !== undefined && data.price !== product.getPrice().amount) {
      product.updatePrice(Money.of(data.price, product.getPrice().currency));
    }

    if (
      typeof data.discountPrice === "number" &&
      data.discountPrice !== product.getDiscountedPrice()?.amount
    ) {
      product.updateDiscountedPrice(
        Money.of(data.discountPrice, product.getPrice().currency),
      );
    }

    if (data.discountPrice === null && product.getDiscountedPrice() !== null) {
      product.updateDiscountedPrice(null);
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
