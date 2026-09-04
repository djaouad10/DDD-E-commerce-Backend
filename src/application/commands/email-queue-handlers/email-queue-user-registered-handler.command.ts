import type { UserRole } from "#/domain/entities/user.js";
import type { DomainEventCode } from "#/domain/events/domain-event.js";

export class EmailQueueUserRegisteredHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.USER_REGISTERED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly role: UserRole,
  ) {}
}
