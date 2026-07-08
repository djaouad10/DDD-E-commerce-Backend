import type { DomainEvent } from "../domain-event.js";

export class UserRegistered implements DomainEvent {
  readonly eventType = "user.registered";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly email: string,
    readonly name: string,
    readonly role: string,
  ) {}
}
