import type { EmailQueueRatingApprovedHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-rating-approved-handler.command.js";
import type { IdempotencyKeysRepository } from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { buildRatingApprovedEmailTemplate } from "#/infrastructure/notifications/templates/rating-approved.email.template.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";

export class EmailQueueRatingApprovedHandlerService {
  private logger = createLogger("EmailQueueRatingApprovedHandlerService");

  constructor(
    private db: DBClient,
    private emailGateway: EmailGateway,
    private userRepository: UserRepository,
    private productRepository: ProductRepository,
    private ratingRepository: RatingRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmailQueueRatingApprovedHandlerCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("EmailQueueRatingApprovedHandlerService.execute called");

    const { userId, productId } = command;

    const [user, product, rating] = await Promise.all([
      this.userRepository.find(UserId.of(userId)),
      this.productRepository.find(ProductId.of(productId)),
      this.ratingRepository.find(UserId.of(userId), ProductId.of(productId)),
    ]);

    if (!user) {
      this.logger.debug("User not found", { userId });
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

    const ratingApprovedEmailTemplate = buildRatingApprovedEmailTemplate({
      productSnapshot: product.toSnapshot(),
      ratingSnapshot: rating.toSnapshot(),
      approvedAt: command.occurredOn,
    });

    await this.db.transaction(async (tx) => {
      // if job was already processed this will throw unique constraint violation error
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmailQueueRatingApprovedHandlerService",
        tx,
      );

      await this.emailGateway.sendEmail(
        user.email,
        "Rating Approved",
        ratingApprovedEmailTemplate,
      );
    });
  }
}
