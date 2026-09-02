import { DomainEventCode } from "#/domain/events/domain-event.js";

export class EmailQueueRatingRejectedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.RATING_REJECTED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly productId: string,
  ) {}
}
