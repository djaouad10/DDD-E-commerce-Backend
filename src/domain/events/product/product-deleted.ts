import type { DomainEvent } from "../domain-event.js";

export class ProductDeleted implements DomainEvent {
  readonly eventType = "product.deleted";
  readonly occurredOn = new Date();

  constructor(readonly aggregateId: string) {}
}
