import { DomainEventCode } from "#/domain/events/domain-event.js";

export class EmailQueueRatingApprovedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.RATING_APPROVED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly productId: string,
    public readonly rating: number,
  ) {}
}
