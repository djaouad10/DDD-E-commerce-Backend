import type { DomainEvent } from "../domain-event.js";

export class RatingSubmitted implements DomainEvent {
  readonly eventType = "rating.submitted";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string, // composite: userId_productId
    readonly userId: string,
    readonly productId: string,
    readonly rating: number,
    readonly comment: string | null,
  ) {}
}
