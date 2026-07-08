import type { DomainEvent } from "../domain-event.js";

export class UserProfileUpdated implements DomainEvent {
  readonly eventType = "user.profile-updated";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly changedFields: string[],
  ) {}
}
