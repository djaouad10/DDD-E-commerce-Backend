import { DomainEventCode } from "#/domain/events/domain-event.js";

export class EmailQueueOrderCancelledHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.ORDER_CANCELLED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
  ) {}
}
