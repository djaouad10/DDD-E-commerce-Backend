import type { DomainEvent } from "../domain-event.js";

export class VariationStockUpdated implements DomainEvent {
  readonly eventType = "variation.stock-updated";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly variationId: string,
    readonly previousTotalQty: number,
    readonly newTotalQty: number,
    readonly newAvailableQty: number,
  ) {}
}
