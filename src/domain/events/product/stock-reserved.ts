import type { DomainEvent } from "../domain-event.js";

export class StockReserved implements DomainEvent {
  readonly eventType = "stock.reserved";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly variationId: string,
    readonly qty: number,
    readonly newAvailableQty: number,
    readonly newReservedQty: number,
  ) {}
}
