import { Rating } from "#/domain/entities/rating.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CreateRatingCommand } from "../../commands/api/create-rating.command.js";
import type { OutboxRepository } from "../../ports/persistence/outbox.repository.port.js";

export class CreateRatingService {
  private logger = createLogger("CreateRatingService");

  constructor(
    private db: DrizzleDBClient,
    private ratingRepository: RatingRepository,
    private productRepository: ProductRepository,
    private userRepository: UserRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: CreateRatingCommand): Promise<void> {
    this.logger.info("CreateRatingService.execute called", { command });

    // make sure user never rated this product before
    const [existingRating, product, user] = await Promise.all([
      this.ratingRepository.find(
        UserId.of(command.clientId),
        ProductId.of(command.productId),
      ),
      this.productRepository.find(ProductId.of(command.productId)),
      this.userRepository.find(UserId.of(command.clientId)),
    ]);

    if (existingRating)
      throw new ConflictError(
        "rating",
        `${command.productId}_${command.clientId}`,
        "user already rated this product",
      );

    if (!product) throw new NotFoundError("product", command.productId);

    if (!user) throw new NotFoundError("user", command.clientId);

    const rating = Rating.create(
      UserId.of(command.clientId),
      ProductId.of(command.productId),
      command.rating,
      command.comment,
    );

    const events = rating.pullEvents();

    this.logger.info("Saving rating", {
      productId: rating.productId.value,
      userId: rating.userId.value,
    });

    await this.db.transaction(async (tx) => {
      await this.ratingRepository.save(rating, tx);

      if (events.length > 0) {
        this.logger.info("Saving events", { count: events.length });
        await this.outboxRepository.saveEvents(events, tx);
      }
    });
  }
}
