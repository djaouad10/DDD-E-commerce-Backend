import type { DomainEvent } from "../domain-event.js";

export class UserBanned implements DomainEvent {
  readonly eventType = "user.banned";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly banReason: string | null,
    readonly banExpires: string | null,
  ) {}
}
