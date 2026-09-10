import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ValidationError } from "#/shared/errors/errors.js";

export class EmailQueueOrderCancelledHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.ORDER_CANCELLED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
  ) {
    this.validate();
  }

  private validate() {
    if (this.occurredOn > new Date()) {
      throw new ValidationError(
        "orderCancelled.occurredOn",
        "must be in the past",
      );
    }
  }
}
