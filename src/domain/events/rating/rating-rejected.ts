import type { DomainEvent } from "../domain-event.js";

export class RatingRejected implements DomainEvent {
  readonly eventType = "rating.rejected";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly productId: string,
  ) {}
}
