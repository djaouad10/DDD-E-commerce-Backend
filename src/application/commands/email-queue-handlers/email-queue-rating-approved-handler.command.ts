import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class EmailQueueRatingApprovedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.RATING_APPROVED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly productId: string,
    public readonly rating: number,
  ) {
    this.validate();
  }

  private validate() {
    if (this.occurredOn > new Date()) {
      throw new ValidationError(
        "ratingApproved.occurredOn",
        "must be in the past",
      );
    }

    if (this.rating <= 0 || this.rating > 5) {
      throw new ValidationError(
        "ratingApproved.rating",
        "must be between 1 and 5",
      );
    }
  }
}
