// add more later
export type DomainEventType = "order.created";
export interface DomainEvent {
  readonly eventType: DomainEventType;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}
