import { EmailQueueOrderCancelledHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-cancelled-handler.command.js";
import { EmailQueueOrderConfirmedHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-confirmed-handler.command.js";
import { EmailQueueOrderCreatedHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-created-handler.command.js";
import { EmailQueueOrderDeliveredHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-delivered-handler.command.js";
import { EmailQueueOrderReturnedHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-returned-handler.command.js";
import { EmailQueueRatingApprovedHandlerCommand } from "#/application/commands/event-handlers/email-queue-rating-approved-handler.command.js";
import { EmailQueueRatingRejectedHandlerCommand } from "#/application/commands/event-handlers/email-queue-rating-rejected-handler.command.js";
import { EmailQueueRatingSubmittedHandlerCommand } from "#/application/commands/event-handlers/email-queue-rating-submitted-handler.command.js";
import { EmailQueueUserRegisteredHandlerCommand } from "#/application/commands/event-handlers/email-queue-user-registered-handler.command.js";
import { EmailQueueOrderCancelledHandlerService } from "#/application/services/event-handlers/email-queue-order-cancelled-handler.service.js";
import type { EmailQueueOrderConfirmedHandlerService } from "#/application/services/event-handlers/email-queue-order-confirmed-handler.service.js";
import type { EmailQueueOrderCreatedHandlerService } from "#/application/services/event-handlers/email-queue-order-created-handler.service.js";
import type { EmailQueueOrderDeliveredHandlerService } from "#/application/services/event-handlers/email-queue-order-delivered-handler.service.js";
import type { EmailQueueOrderReturnedHandlerService } from "#/application/services/event-handlers/email-queue-order-returned-handler.service.js";
import type { EmailQueueRatingApprovedHandlerService } from "#/application/services/event-handlers/email-queue-rating-approved-handler.service.js";
import type { EmailQueueRatingRejectedHandlerService } from "#/application/services/event-handlers/email-queue-rating-rejected-handler.service.js";
import type { EmailQueueRatingSubmittedHandlerService } from "#/application/services/event-handlers/email-queue-rating-submitted-handler.service.js";
import type { EmailQueueUserRegisteredHandlerService } from "#/application/services/event-handlers/email-queue-user-registered-handler.service.js";
import {
  EMAIL_QUEUE_ORDER_CREATED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_CANCELLED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_CONFIRMED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_DELIVERED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_RETURNED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_APPROVED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_REJECTED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_SUBMITTED_HANDLER_SERVICE,
  EMAIL_QUEUE_USER_REGISTERED_HANDLER_SERVICE,
} from "#/composition/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { DomainEventsPayloadTypes } from "./validation.js";

// build services and commands first

export type EmailQueueDomainEvents =
  | typeof DomainEventCode.ORDER_CREATED
  | typeof DomainEventCode.ORDER_CONFIRMED
  | typeof DomainEventCode.ORDER_CANCELLED
  | typeof DomainEventCode.ORDER_DELIVERED
  | typeof DomainEventCode.ORDER_RETURNED
  | typeof DomainEventCode.RATING_APPROVED
  | typeof DomainEventCode.RATING_REJECTED
  | typeof DomainEventCode.RATING_SUBMITTED
  | typeof DomainEventCode.USER_REGISTERED;

type EmailQueueEventToCommand = {
  [DomainEventCode.ORDER_CREATED]: EmailQueueOrderCreatedHandlerCommand;
  [DomainEventCode.ORDER_CONFIRMED]: EmailQueueOrderConfirmedHandlerCommand;
  [DomainEventCode.ORDER_CANCELLED]: EmailQueueOrderCancelledHandlerCommand;
  [DomainEventCode.ORDER_DELIVERED]: EmailQueueOrderDeliveredHandlerCommand;
  [DomainEventCode.ORDER_RETURNED]: EmailQueueOrderReturnedHandlerCommand;
  [DomainEventCode.RATING_APPROVED]: EmailQueueRatingApprovedHandlerCommand;
  [DomainEventCode.RATING_REJECTED]: EmailQueueRatingRejectedHandlerCommand;
  [DomainEventCode.RATING_SUBMITTED]: EmailQueueRatingSubmittedHandlerCommand;
  [DomainEventCode.USER_REGISTERED]: EmailQueueUserRegisteredHandlerCommand;
};

type EmailQueueEventToService = {
  [DomainEventCode.ORDER_CREATED]: EmailQueueOrderCreatedHandlerService;
  [DomainEventCode.ORDER_CONFIRMED]: EmailQueueOrderConfirmedHandlerService;
  [DomainEventCode.ORDER_CANCELLED]: EmailQueueOrderCancelledHandlerService;
  [DomainEventCode.ORDER_DELIVERED]: EmailQueueOrderDeliveredHandlerService;
  [DomainEventCode.ORDER_RETURNED]: EmailQueueOrderReturnedHandlerService;
  [DomainEventCode.RATING_APPROVED]: EmailQueueRatingApprovedHandlerService;
  [DomainEventCode.RATING_REJECTED]: EmailQueueRatingRejectedHandlerService;
  [DomainEventCode.RATING_SUBMITTED]: EmailQueueRatingSubmittedHandlerService;
  [DomainEventCode.USER_REGISTERED]: EmailQueueUserRegisteredHandlerService;
};

type EmailQueueEventToToken = {
  [DomainEventCode.ORDER_CREATED]: typeof EMAIL_QUEUE_ORDER_CREATED_HANDLER_SERVICE;
  [DomainEventCode.ORDER_CONFIRMED]: typeof EMAIL_QUEUE_ORDER_CONFIRMED_HANDLER_SERVICE;
  [DomainEventCode.ORDER_CANCELLED]: typeof EMAIL_QUEUE_ORDER_CANCELLED_HANDLER_SERVICE;
  [DomainEventCode.ORDER_DELIVERED]: typeof EMAIL_QUEUE_ORDER_DELIVERED_HANDLER_SERVICE;
  [DomainEventCode.ORDER_RETURNED]: typeof EMAIL_QUEUE_ORDER_RETURNED_HANDLER_SERVICE;
  [DomainEventCode.RATING_APPROVED]: typeof EMAIL_QUEUE_RATING_APPROVED_HANDLER_SERVICE;
  [DomainEventCode.RATING_REJECTED]: typeof EMAIL_QUEUE_RATING_REJECTED_HANDLER_SERVICE;
  [DomainEventCode.RATING_SUBMITTED]: typeof EMAIL_QUEUE_RATING_SUBMITTED_HANDLER_SERVICE;
  [DomainEventCode.USER_REGISTERED]: typeof EMAIL_QUEUE_USER_REGISTERED_HANDLER_SERVICE;
};

export function buildEmailQueueEventCommand<T extends EmailQueueDomainEvents>(
  event: T,
  payload: DomainEventsPayloadTypes<T>,
): EmailQueueEventToCommand[T] {
  switch (event) {
    case DomainEventCode.ORDER_CREATED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.ORDER_CREATED
      >;

      return new EmailQueueOrderCreatedHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.userId,
        p.itemCount,
        p.totalPrice,
        p.currency,
        p.selectedShippingProvider,
      ) as EmailQueueEventToCommand[T];
    }

    case DomainEventCode.ORDER_CONFIRMED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.ORDER_CONFIRMED
      >;

      return new EmailQueueOrderConfirmedHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.userId,
        p.itemCount,
        p.totalPrice,
        p.currency,
        p.selectedShippingProvider,
      ) as EmailQueueEventToCommand[T];
    }

    case DomainEventCode.ORDER_CANCELLED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.ORDER_CANCELLED
      >;

      return new EmailQueueOrderCancelledHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.userId,
      ) as EmailQueueEventToCommand[T];
    }

    case DomainEventCode.ORDER_DELIVERED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.ORDER_DELIVERED
      >;

      return new EmailQueueOrderDeliveredHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.userId,
        p.deliveredAt,
        p.selectedShippingProvider,
      ) as EmailQueueEventToCommand[T];
    }

    case DomainEventCode.ORDER_RETURNED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.ORDER_RETURNED
      >;

      return new EmailQueueOrderReturnedHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.userId,
        p.reason,
        p.selectedShippingProvider,
      ) as EmailQueueEventToCommand[T];
    }

    case DomainEventCode.RATING_APPROVED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.RATING_APPROVED
      >;

      return new EmailQueueRatingApprovedHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.userId,
        p.productId,
        p.rating,
      ) as EmailQueueEventToCommand[T];
    }

    case DomainEventCode.RATING_REJECTED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.RATING_REJECTED
      >;

      return new EmailQueueRatingRejectedHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.userId,
        p.productId,
      ) as EmailQueueEventToCommand[T];
    }

    case DomainEventCode.RATING_SUBMITTED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.RATING_SUBMITTED
      >;

      return new EmailQueueRatingSubmittedHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.userId,
        p.productId,
        p.rating,
        p.comment,
      ) as EmailQueueEventToCommand[T];
    }

    case DomainEventCode.USER_REGISTERED: {
      const p = payload as DomainEventsPayloadTypes<
        typeof DomainEventCode.USER_REGISTERED
      >;

      return new EmailQueueUserRegisteredHandlerCommand(
        p.eventType,
        p.occurredOn,
        p.aggregateId,
        p.email,
        p.name,
        p.role,
      ) as EmailQueueEventToCommand[T];
    }

    default:
      const _exhaustive: never = event;
      throw new Error(`Unhandled Email Queue Domain Event: ${_exhaustive}`);
  }
}

type EmailQueueEventHandlerRegistryEntry<T extends EmailQueueDomainEvents> = {
  token: EmailQueueEventToToken[T];
  handlerMethod: (
    handler: EmailQueueEventToService[T],
    command: EmailQueueEventToCommand[T],
    jobId: string,
  ) => Promise<void>;
};

const emailQueuEventeHandlerRegistry: {
  [K in EmailQueueDomainEvents]: EmailQueueEventHandlerRegistryEntry<K>;
} = {
  [DomainEventCode.ORDER_CREATED]: {
    token: EMAIL_QUEUE_ORDER_CREATED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.ORDER_CONFIRMED]: {
    token: EMAIL_QUEUE_ORDER_CONFIRMED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.ORDER_CANCELLED]: {
    token: EMAIL_QUEUE_ORDER_CANCELLED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.ORDER_DELIVERED]: {
    token: EMAIL_QUEUE_ORDER_DELIVERED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.ORDER_RETURNED]: {
    token: EMAIL_QUEUE_ORDER_RETURNED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.RATING_APPROVED]: {
    token: EMAIL_QUEUE_RATING_APPROVED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.RATING_REJECTED]: {
    token: EMAIL_QUEUE_RATING_REJECTED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.RATING_SUBMITTED]: {
    token: EMAIL_QUEUE_RATING_SUBMITTED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [DomainEventCode.USER_REGISTERED]: {
    token: EMAIL_QUEUE_USER_REGISTERED_HANDLER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },
};

function executeEmailQueueEventHandler() {}
