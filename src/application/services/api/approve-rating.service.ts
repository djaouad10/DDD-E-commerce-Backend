import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { ApproveRatingCommand } from "../../commands/api/approve-rating.command.js";
import type { OutboxRepository } from "../../ports/persistence/outbox.repository.port.js";

export class ApproveRatingService {
  private logger = createLogger("ApproveRatingService");

  constructor(
    private db: DrizzleDBClient,
    private ratingRepository: RatingRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: ApproveRatingCommand): Promise<void> {
    this.logger.info("ApproveRatingService.execute called", { command });

    const rating = await this.ratingRepository.find(
      UserId.of(command.clientId),
      ProductId.of(command.productId),
    );

    if (!rating)
      throw new NotFoundError(
        "rating",
        `${command.productId}_${command.clientId}`,
      );

    if (rating.isApproved()) return;

    rating.approve();

    const events = rating.pullEvents();

    this.logger.debug("Saving rating", {
      productId: rating.productId.value,
      userId: rating.userId.value,
    });

    await this.db.transaction(async (tx) => {
      await this.ratingRepository.save(rating, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        await this.outboxRepository.saveEvents(events, tx);
      }
    });
  }
}
