import { DomainEventCode } from "#/domain/events/domain-event.js";

export class EmailQueueRatingSubmittedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.RATING_SUBMITTED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly productId: string,
    public readonly rating: number,
    public readonly comment: string | null,
  ) {}
}
