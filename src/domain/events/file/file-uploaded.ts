import type { DomainEvent } from "../domain-event.js";

export class FileUploaded implements DomainEvent {
  readonly eventType = "file.uploaded";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly productId: string,
    readonly key: string,
    readonly isMain: boolean,
  ) {}
}
