import type { DomainEvent } from "../domain-event.js";

export class UserUnBanned implements DomainEvent {
  readonly eventType = "user.unBanned";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {}
}
