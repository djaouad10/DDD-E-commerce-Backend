import type { DomainEvent } from "../domain-event.js";

export class ProductMainImageUpdated implements DomainEvent {
  readonly eventType = "product.main-image-updated";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly newMainImageKey: string,
    readonly previousMainImageKey: string | null,
  ) {}
}
