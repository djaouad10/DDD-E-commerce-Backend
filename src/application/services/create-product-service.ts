import type { ProductSnapshot } from "#/domain/entities-snapshots/product.snapshot.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CreateProductCommand } from "../commands/create-product-command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";
import { File } from "#/domain/entities/file.js";
import { Product } from "#/domain/entities/product.js";
import { Slug } from "#/domain/value-objects/slug.js";
import { CategoryId } from "#/domain/value-objects/category-id.js";
import { Variation } from "#/domain/entities/variation.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { Money } from "#/domain/value-objects/money.js";

export class CreateProductService {
  private logger = createLogger("CreateProductService");

  constructor(
    private db: DrizzleDBClient,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: CreateProductCommand): Promise<ProductSnapshot> {
    this.logger.info("CreateProductService.execute called", { command });

    const { mainImage, categoryId, ...data } = command;

    const image = File.create(
      mainImage.key,
      mainImage.name,
      mainImage.public_url,
      true,
    );

    const variations = data.variations.map((v) =>
      Variation.create(
        v.size,
        v.color,
        v.totalQty,
        0,
        Weight.of(v.weightInGrams, "g"),
      ),
    );

    const product = Product.create(
      data.name,
      Slug.generate(data.name),
      categoryId ? CategoryId.of(categoryId) : null,
      [image],
      variations,
      data.description,
      data.brand,
      data.material,
      Money.of(data.price, "DZD"),
      data.discount_price ? Money.of(data.discount_price, "DZD") : null,
      null,
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

    return product.toSnapshot();
  }
}
