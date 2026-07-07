export type DomainEventType =
  | "order.created"
  | "user.registered"
  | "user.banned"
  | "user.unBanned";

export interface DomainEvent {
  readonly eventType: DomainEventType;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}
