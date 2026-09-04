import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class EmailQueueRatingSubmittedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.RATING_SUBMITTED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly productId: string,
    public readonly rating: number,
    public readonly comment: string | null,
  ) {
    this.validate();
  }

  private validate() {
    if (this.occurredOn > new Date()) {
      throw new ValidationError(
        "ratingSubmitted.occurredOn",
        "must be in the past",
      );
    }

    if (this.rating <= 0 || this.rating > 5) {
      throw new ValidationError(
        "ratingSubmitted.rating",
        "must be between 1 and 5",
      );
    }
  }
}
