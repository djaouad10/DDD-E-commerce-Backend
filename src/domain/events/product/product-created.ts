import type { DomainEvent } from "../domain-event.js";

export class ProductCreated implements DomainEvent {
  readonly eventType = "product.created";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly name: string,
    readonly slug: string,
    readonly categoryId: string | null,
    readonly brand: string,
    readonly price: number,
    readonly currency: string,
  ) {}
}
