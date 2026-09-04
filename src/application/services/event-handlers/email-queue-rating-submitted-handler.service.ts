import type { EmailQueueRatingSubmittedHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-rating-submitted-handler.command.js";
import type { UserQueries } from "#/application/read-models/user.queries.js";
import type { IdempotencyKeysRepository } from "#/application/repositories/idempotency-keys.repository.js";
import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { buildRatingSubmittedEmailTemplate } from "#/infrastructure/notifications/templates/rating-submitted.email.template.js";

import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";

export class EmailQueueRatingSubmittedHandlerService {
  private logger = createLogger("EmailQueueRatingSubmittedHandlerService");

  constructor(
    private db: DrizzleDBClient,
    private emailGateway: EmailGateway,
    private userQueries: UserQueries,
    private productRepository: ProductRepository,
    private ratingRepository: RatingRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmailQueueRatingSubmittedHandlerCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("EmailQueueRatingSubmittedHandlerService.execute called");

    const { userId, productId } = command;

    const [admins, product, rating] = await Promise.all([
      this.userQueries.search({ role: "ADMIN", limit: 1 }),
      this.productRepository.find(ProductId.of(productId)),
      this.ratingRepository.find(UserId.of(userId), ProductId.of(productId)),
    ]);

    const admin = admins.users[0];

    if (!admin) {
      this.logger.debug("Admin not found", { userId });
      throw new NotFoundError("user", userId);
    }

    if (!product) {
      this.logger.debug("product not found", { productId });
      throw new NotFoundError("product", productId);
    }

    if (!rating) {
      this.logger.debug("rating not found", { userId, productId });
      throw new NotFoundError("rating", `${userId}_${productId}`);
    }

    const ratingSubmittedEmailTemplate = buildRatingSubmittedEmailTemplate({
      productSnapshot: product.toSnapshot(),
      ratingSnapshot: rating.toSnapshot(),
      submittedAt: command.occurredOn,
    });

    await this.db.transaction(async (tx) => {
      // if job was already processed this will throw unique constraint violation error
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmailQueueRatingSubmittedHandlerService",
        tx,
      );

      await this.emailGateway.sendEmail(
        admin.email,
        "Rating Submitted",
        ratingSubmittedEmailTemplate,
      );
    });
  }
}
