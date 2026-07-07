export type DomainEventType =
  | "order.created"
  | "order.marked-as-pre-transit"
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
