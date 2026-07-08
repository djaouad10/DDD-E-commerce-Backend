import type { DomainEvent } from "../domain-event.js";

export class VariationCreated implements DomainEvent {
  readonly eventType = "variation.created";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly variationId: string,
    readonly size: string,
    readonly color: string,
    readonly totalQty: number,
    readonly weightInGrams: number,
  ) {}
}
