import type { DomainEvent } from "../domain-event.js";

export class ProductImageAdded implements DomainEvent {
  readonly eventType = "product.image-added";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly imageId: string,
    readonly isMain: boolean,
  ) {}
}
