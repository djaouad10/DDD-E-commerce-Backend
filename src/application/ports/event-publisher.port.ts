import type { DomainEventCode } from "#/domain/events/domain-event.js";

export interface EventPublisherPort {
  publish(eventType: DomainEventCode, payload: unknown): Promise<void>;
}
