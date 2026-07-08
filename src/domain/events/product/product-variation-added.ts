import type { DomainEvent } from "../domain-event.js";

export class ProductVariationAdded implements DomainEvent {
  readonly eventType = "product.variation-added";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly variationId: string,
    readonly size: string,
    readonly color: string,
  ) {}
}
