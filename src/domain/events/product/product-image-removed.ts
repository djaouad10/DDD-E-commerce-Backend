import type { DomainEvent } from "../domain-event.js";

export class ProductImageRemoved implements DomainEvent {
  readonly eventType = "product.image-removed";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly imageKey: string,
  ) {}
}
