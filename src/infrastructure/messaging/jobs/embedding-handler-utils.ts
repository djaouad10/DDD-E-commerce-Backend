import { EmbeddingQueueProductUpsertedEventsHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-created-event-handler.command.js";
import { EmbeddingQueueProductDeletedEventHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-deleted-event-handler.command.js";
import { EmbeddingQueueProductDeletedEventHandlerService } from "#/application/services/embedding-queue-handlers/embedding-queue-product-deleted-event-handler.service.js";
import { EmbeddingQueueProductUpsertedEventsHandlerService } from "#/application/services/embedding-queue-handlers/embedding-queue-product-upserted-events-handler.service.js";
import type { InjectionToken, Scope } from "#/composition/utils/container.js";
import {
  EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
  EMBEDDING_QUEUE_PRODUCT_DELETED_EVENTS_HANDLER_SERVICE,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { EmbeddingDomainEventsPayloadTypes } from "./validation.js";

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

export function buildEmbeddingQueueEventCommand<
  T extends EmbeddingQueueDomainEvents,
>(
  event: T,
  payload: EmbeddingDomainEventsPayloadTypes<T>,
): EmbeddingQueueEventToCommand[T] {
  switch (event) {
    case DomainEventCode.PRODUCT_CREATED: {
      const p = payload as EmbeddingDomainEventsPayloadTypes<
        typeof DomainEventCode.PRODUCT_CREATED
      >;

      return new EmbeddingQueueProductUpsertedEventsHandlerCommand(
        p.aggregateId,
      ) as EmbeddingQueueEventToCommand[T];
    }

    case DomainEventCode.PRODUCT_UPDATED: {
      const p = payload as EmbeddingDomainEventsPayloadTypes<
        typeof DomainEventCode.PRODUCT_UPDATED
      >;

      return new EmbeddingQueueProductUpsertedEventsHandlerCommand(
        p.aggregateId,
      ) as EmbeddingQueueEventToCommand[T];
    }

    case DomainEventCode.PRODUCT_DELETED: {
      const p = payload as EmbeddingDomainEventsPayloadTypes<
        typeof DomainEventCode.PRODUCT_DELETED
      >;

      return new EmbeddingQueueProductUpsertedEventsHandlerCommand(
        p.aggregateId,
      ) as EmbeddingQueueEventToCommand[T];
    }

    default: {
      const _exhaustive: never = event;
      throw new Error(`Unhandled Embedding Queue Domain Event: ${_exhaustive}`);
    }
  }
}

type EmbeddingQueueEventHandlerRegistryEntry<
  T extends EmbeddingQueueDomainEvents,
> = {
  token: EmbeddingQueueEventToToken[T];
  handlerMethod: (
    handler: EmbeddingQueueEventToService[T],
    command: EmbeddingQueueEventToCommand[T],
    jobId: string,
  ) => Promise<void>;
};

const embeddingQueueEventeHandlerRegistry: {
  [K in EmbeddingQueueDomainEvents]: EmbeddingQueueEventHandlerRegistryEntry<K>;
} = {
  [DomainEventCode.PRODUCT_CREATED]: {
    token: EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.PRODUCT_UPDATED]: {
    token: EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.PRODUCT_DELETED]: {
    token: EMBEDDING_QUEUE_PRODUCT_DELETED_EVENTS_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },
};

export async function executeEmbeddingQueueEventHandler<
  T extends EmbeddingQueueDomainEvents,
>(
  event: T,
  scope: Scope,
  command: EmbeddingQueueEventToCommand[T],
  jobId: string,
): Promise<unknown> {
  const entry = embeddingQueueEventeHandlerRegistry[event];

  const service = scope.resolve<EmbeddingQueueEventToService[T]>(
    entry.token as InjectionToken<EmbeddingQueueEventToService[T]>,
  );

  return entry.handlerMethod(service, command, jobId);
}
