import type { DomainEvent } from "../domain-event.js";

export class UserUnBanned implements DomainEvent {
  readonly eventType = "user.unbanned";
  readonly occurredOn = new Date();

  constructor(readonly aggregateId: string) {}
}
