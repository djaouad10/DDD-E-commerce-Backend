import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";
import type { DeleteRatingCommand } from "../../commands/api/delete-rating.command.js";
import type { OutboxRepository } from "../../ports/persistence/outbox.repository.port.js";

export class DeleteRatingService {
  private logger = createLogger("DeleteRatingService");

  constructor(
    private db: DBClient,
    private ratingRepository: RatingRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: DeleteRatingCommand): Promise<void> {
    this.logger.info("DeleteRatingService.execute called", { command });

    const rating = await this.ratingRepository.find(
      UserId.of(command.clientId),
      ProductId.of(command.productId),
    );

    if (!rating)
      throw new NotFoundError(
        "rating",
        `${command.productId}_${command.clientId}`,
      );

    rating.reject();

    const events = rating.pullEvents();

    this.logger.debug("Deleting rating", {
      productId: rating.productId.value,
      userId: rating.userId.value,
    });

    await this.db.transaction(async (tx) => {
      await this.ratingRepository.delete(rating.userId, rating.productId, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        await this.outboxRepository.saveEvents(events, tx);
      }
    });
  }
}
