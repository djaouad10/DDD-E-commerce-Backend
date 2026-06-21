import type { DomainEvent } from "./domain-event.js";

export class UserRegisteredEvent implements DomainEvent {
  readonly eventType = "user.welcome_email";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly email: string,
  ) {}
}
