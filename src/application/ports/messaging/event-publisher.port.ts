import type { DomainEventCode } from "#/domain/events/domain-event.js";

export interface EventPublisher {
  publish(
    eventType: DomainEventCode,
    payload: unknown,
    jobId: string,
  ): Promise<void>;
}
