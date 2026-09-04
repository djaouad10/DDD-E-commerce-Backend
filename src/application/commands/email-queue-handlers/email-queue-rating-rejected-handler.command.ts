import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class EmailQueueRatingRejectedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.RATING_REJECTED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly productId: string,
  ) {
    this.validate();
  }

  private validate() {
    if (this.occurredOn > new Date()) {
      throw new ValidationError(
        "ratingRejected.occurredOn",
        "must be in the past",
      );
    }
  }
}
