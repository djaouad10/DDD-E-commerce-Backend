import type { EmailQueueOrderCancelledHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-cancelled-handler.command.js";
import type { EmailQueueOrderConfirmedHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-confirmed-handler.command.js";
import type { EmailQueueOrderCreatedHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-created-handler.command.js";
import type { EmailQueueOrderDeliveredHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-delivered-handler.command.js";
import type { EmailQueueOrderReturnedHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-returned-handler.command.js";
import type { EmailQueueRatingApprovedHandlerCommand } from "#/application/commands/event-handlers/email-queue-rating-approved-handler.command.js";
import type { EmailQueueRatingRejectedHandlerCommand } from "#/application/commands/event-handlers/email-queue-rating-rejected-handler.command.js";
import type { EmailQueueRatingSubmittedHandlerCommand } from "#/application/commands/event-handlers/email-queue-rating-submitted-handler.command.js";
import type { EmailQueueUserRegisteredHandlerCommand } from "#/application/commands/event-handlers/email-queue-user-registered-handler.command.js";
import type { EmailQueueOrderCancelledHandlerService } from "#/application/services/event-handlers/email-queue-order-cancelled-handler.service.js";
import type { EmailQueueOrderConfirmedHandlerService } from "#/application/services/event-handlers/email-queue-order-confirmed-handler.service.js";
import type { EmailQueueOrderCreatedHandlerService } from "#/application/services/event-handlers/email-queue-order-created-handler.service.js";
import type { EmailQueueOrderDeliveredHandlerService } from "#/application/services/event-handlers/email-queue-order-delivered-handler.service.js";
import type { EmailQueueOrderReturnedHandlerService } from "#/application/services/event-handlers/email-queue-order-returned-handler.service.js";
import type { EmailQueueRatingApprovedHandlerService } from "#/application/services/event-handlers/email-queue-rating-approved-handler.service.js";
import type { EmailQueueRatingRejectedHandlerService } from "#/application/services/event-handlers/email-queue-rating-rejected-handler.service.js";
import type { EmailQueueRatingSubmittedHandlerService } from "#/application/services/event-handlers/email-queue-rating-submitted-handler.service.js";
import type { EmailQueueUserRegisteredHandlerService } from "#/application/services/event-handlers/email-queue-user-registered-handler.service.js";
import type {
  EMAIL_QUEUE_ORDER_CANCELLED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_CONFIRMED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_CREATED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_DELIVERED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_RETURNED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_APPROVED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_REJECTED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_SUBMITTED_HANDLER_SERVICE,
  EMAIL_QUEUE_USER_REGISTERED_HANDLER_SERVICE,
} from "#/composition/tokens.js";
import type { DomainEventCode } from "#/domain/events/domain-event.js";

// build services and commands first

type EmailQueueDomainEvents =
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


