import type { DomainEvent } from "../domain-event.js";

export class ProductUpdated implements DomainEvent {
  readonly eventType = "product.updated";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly changedFields: string[],
  ) {}
}
