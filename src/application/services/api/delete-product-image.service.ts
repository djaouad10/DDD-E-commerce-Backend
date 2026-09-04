import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DeleteProductImageCommand } from "../../commands/api/delete-product-image.command.js";
import type { OutboxRepository } from "../../repositories/outbox.repository.js";

export class DeleteProductImageService {
  private logger = createLogger("DeleteProductImageService");

  constructor(
    private db: DrizzleDBClient,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: DeleteProductImageCommand): Promise<void> {
    this.logger.info("DeleteProductImageService.execute called", {
      ...command,
    });

    const { productId, imageKey } = command;

    const product = await this.productRepository.find(ProductId.of(productId));

    if (!product) throw new NotFoundError("product", productId);

    const image = product.getImageByKey(imageKey);

    if (!image) throw new NotFoundError("image", imageKey);

    product.removeImage(image.id);

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
