import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { AddSecondaryImageToProductCommand } from "../commands/add-secondary-image-to-product.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";
import { File } from "#/domain/entities/file.js";

export class AddSecondaryImageToProductService {
  private logger = createLogger("AddSecondaryImageToProductService");

  constructor(
    private db: DrizzleDBClient,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: AddSecondaryImageToProductCommand): Promise<void> {
    this.logger.info("AddSecondaryImageToProductService.execute called", {
      command,
    });

    const { data } = command;

    const product = await this.productRepository.find(
      ProductId.of(command.productId),
    );

    if (!product) throw new NotFoundError("product", command.productId);

    const image = File.create(data.key, data.name, data.public_url, false);

    product.addImage(image);

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
