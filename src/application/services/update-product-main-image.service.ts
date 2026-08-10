import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateProductMainImageCommand } from "../commands/update-product-main-image.command.js";
import { File } from "#/domain/entities/file.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class UpdateProductMainImageService {
  private logger = createLogger("UpdateProductMainImageService");

  constructor(
    private db: DrizzleDBClient,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: UpdateProductMainImageCommand): Promise<void> {
    this.logger.info("UpdateProductMainImageService.execute called", {
      ...command,
    });

    const { productId, data } = command;

    const product = await this.productRepository.find(ProductId.of(productId));

    if (!product) throw new NotFoundError("product", productId);

    const newMainImage = File.create(data.key, data.name, data.publicUrl, true);
    product.updateMainImage(newMainImage);

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
