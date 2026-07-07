export type DomainEventType =
  | "order.created"
  | "order.cancelled"
  | "order.confirmed"
  | "user.registered"
  | "user.banned"
  | "user.unBanned";

export interface DomainEvent {
  readonly eventType: DomainEventType;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}
