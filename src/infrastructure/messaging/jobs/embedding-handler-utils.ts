import type { EmbeddingQueueProductUpsertedEventsHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-created-event-handler.command.js";
import type { EmbeddingQueueProductDeletedEventHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-deleted-event-handler.command.js";
import type { EmbeddingQueueProductDeletedEventHandlerService } from "#/application/services/embedding-queue-handlers/embedding-queue-product-deleted-event-handler.service.js";
import type { EmbeddingQueueProductUpsertedEventsHandlerService } from "#/application/services/embedding-queue-handlers/embedding-queue-product-upserted-events-handler.service.js";
import type {
  EMBEDDING_QUEUE_PRODUCT_DELETED_EVENTS_HANDLER_SERVICE,
  EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";

export type EmbeddingQueueDomainEvents =
  | typeof DomainEventCode.PRODUCT_CREATED
  | typeof DomainEventCode.PRODUCT_UPDATED
  | typeof DomainEventCode.PRODUCT_DELETED;

type EmbeddingQueueEventToCommand = {
  [DomainEventCode.PRODUCT_CREATED]: EmbeddingQueueProductUpsertedEventsHandlerCommand;
  [DomainEventCode.PRODUCT_UPDATED]: EmbeddingQueueProductUpsertedEventsHandlerCommand;
  [DomainEventCode.PRODUCT_DELETED]: EmbeddingQueueProductDeletedEventHandlerCommand;
};

type EmbeddingQueueEventToService = {
  [DomainEventCode.PRODUCT_CREATED]: EmbeddingQueueProductUpsertedEventsHandlerService;
  [DomainEventCode.PRODUCT_UPDATED]: EmbeddingQueueProductUpsertedEventsHandlerService;
  [DomainEventCode.PRODUCT_DELETED]: EmbeddingQueueProductDeletedEventHandlerService;
};

type EmbeddingQueueEventToToken = {
  [DomainEventCode.PRODUCT_CREATED]: typeof EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE;
  [DomainEventCode.PRODUCT_UPDATED]: typeof EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE;
  [DomainEventCode.PRODUCT_DELETED]: typeof EMBEDDING_QUEUE_PRODUCT_DELETED_EVENTS_HANDLER_SERVICE;
};
