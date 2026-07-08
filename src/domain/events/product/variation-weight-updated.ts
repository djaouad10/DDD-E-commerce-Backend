import type { DomainEvent } from "../domain-event.js";

export class VariationWeightUpdated implements DomainEvent {
  readonly eventType = "variation.weight-updated";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly productId: string,
    readonly previousWeightInGrams: number,
    readonly newWeightInGrams: number,
  ) {}
}
