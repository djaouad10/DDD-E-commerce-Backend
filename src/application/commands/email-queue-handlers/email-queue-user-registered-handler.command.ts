import type { UserRole } from "#/domain/entities/user.js";
import type { DomainEventCode } from "#/domain/events/domain-event.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class EmailQueueUserRegisteredHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.USER_REGISTERED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly role: UserRole,
  ) {
    this.validate();
  }

  private validate() {
    if (this.occurredOn > new Date()) {
      throw new ValidationError(
        "userRegistered.occurredOn",
        "must be in the past",
      );
    }
  }
}
