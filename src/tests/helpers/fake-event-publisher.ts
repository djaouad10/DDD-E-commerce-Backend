import type { EventPublisher } from "#/application/ports/event-publisher.port.js";
import type { DomainEventCode } from "#/domain/events/domain-event.js";

export class FakeEventPublisher implements EventPublisher {
  published: Array<{
    eventType: DomainEventCode;
    payload: unknown;
    jobId: string;
  }> = [];

  shouldFail = false;
  failWithError: Error = new Error("EventPublisher.publish() failed");

  async publish(
    eventType: DomainEventCode,
    payload: unknown,
    jobId: string,
  ): Promise<void> {
    if (this.shouldFail) throw this.failWithError;
    this.published.push({ eventType, payload, jobId });
  }

  clear(): void {
    this.published = [];
    this.shouldFail = false;
  }
}
