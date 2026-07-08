import type { DomainEvent } from "../domain-event.js";

export class ProductVariationRemoved implements DomainEvent {
  readonly eventType = "product.variation-removed";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly variationId: string,
  ) {}
}
