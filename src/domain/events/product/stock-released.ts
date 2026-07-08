import type { DomainEvent } from "../domain-event.js";

export class StockReleased implements DomainEvent {
  readonly eventType = "stock.released";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly variationId: string,
    readonly qty: number,
    readonly newAvailableQty: number,
  ) {}
}
