import type { DomainEvent } from "../domain-event.js";

export class RatingApproved implements DomainEvent {
  readonly eventType = "rating.approved";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly productId: string,
    readonly rating: number,
  ) {}
}
