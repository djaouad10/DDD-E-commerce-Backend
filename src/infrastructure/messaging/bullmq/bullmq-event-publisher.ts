import type { EventPublisher } from "#/application/ports/messaging/event-publisher.port.js";
import type { DomainEventCode } from "#/domain/events/domain-event.js";
import type { Queue, FlowProducer, FlowJob } from "bullmq";

export class BullMqEventPublisher implements EventPublisher {
  constructor(
    private flowProducer: FlowProducer,
    private emailQueue: Queue,
    private inventoryQueue: Queue,
    private analyticsQueue: Queue,
  ) {}

  async publish(
    eventType: DomainEventCode,
    payload: unknown,
    jobId: string,
  ): Promise<void> {
    const queues = this.mapEventToQueues(eventType);

    const jobsArray: FlowJob[] = [];

    for (const queue of queues) {
      jobsArray.push({
        name: eventType,
        data: payload,
        queueName: queue.name,
        opts: {
          jobId: jobId, // unique per queue
          attempts: 5, // BullMQ execution retry configuration (Independent of DB)
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });
    }

    if (jobsArray.length === 0) return;

    await this.flowProducer.addBulk(jobsArray);
  }

  private mapEventToQueues(eventType: DomainEventCode): Queue[] {
    const eventToQueuesMapper: Record<DomainEventCode, Queue[]> = {
      "order.created": [
        this.emailQueue,
        this.inventoryQueue,
        this.analyticsQueue,
      ],
      "order.cancelled": [
        this.emailQueue,
        this.inventoryQueue,
        this.analyticsQueue,
      ],
      "order.confirmed": [this.emailQueue, this.analyticsQueue],
      "order.marked-as-pre-transit": [],
      "order.marked-as-shipping": [],
      "order.delivered": [],
      "order.returned": [],
      "order.suspended": [],
      "order.resumed-from-suspension": [],
      "order.shipping-status-updated": [],
      "user.registered": [],
      "user.profile-updated": [],
      "user.banned": [],
      "user.unbanned": [],
      "category.created": [],
      "category.updated": [],
      "product.created": [],
      "product.updated": [],
      "product.variation-added": [],
      "product.variation-removed": [],
      "product.image-added": [],
      "product.main-image-updated": [],
      "product.image-removed": [],
      "variation.created": [],
      "variation.stock-updated": [],
      "variation.weight-updated": [],
      "stock.reserved": [],
      "stock.released": [],
      "cart.created": [],
      "cart.item-added": [],
      "cart.item-removed": [],
      "cart.item-qty-updated": [],
      "cart.cleared": [],
      "rating.submitted": [],
      "rating.approved": [],
      "rating.rejected": [],
      "file.uploaded": [],
      "order.shipping-details-updated": [],
    };

    return eventToQueuesMapper[eventType] ?? [];
  }
}
