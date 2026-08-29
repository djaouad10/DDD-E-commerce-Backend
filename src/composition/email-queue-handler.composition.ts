import { EmailQueueOrderCancelledHandlerService } from "#/application/services/event-handlers/email-queue-order-cancelled-handler.service.js";
import { EmailQueueOrderConfirmedHandlerService } from "#/application/services/event-handlers/email-queue-order-confirmed-handler.service.js";
import { EmailQueueOrderCreatedHandlerService } from "#/application/services/event-handlers/email-queue-order-created-handler.service.js";
import { EmailQueueOrderDeliveredHandlerService } from "#/application/services/event-handlers/email-queue-order-delivered-handler.service.js";
import { EmailQueueOrderReturnedHandlerService } from "#/application/services/event-handlers/email-queue-order-returned-handler.service.js";
import { EmailQueueRatingApprovedHandlerService } from "#/application/services/event-handlers/email-queue-rating-approved-handler.service.js";
import { EmailQueueRatingRejectedHandlerService } from "#/application/services/event-handlers/email-queue-rating-rejected-handler.service.js";
import { EmailQueueRatingSubmittedHandlerService } from "#/application/services/event-handlers/email-queue-rating-submitted-handler.service.js";
import { EmailQueueUserRegisteredHandlerService } from "#/application/services/event-handlers/email-queue-user-registered-handler.service.js";
import { env } from "#/infrastructure/config/env.js";
import { PostgresUserQueries } from "#/infrastructure/databases/read-models/postgres/postgres-user-queries.js";
import { PostgresIdempotencyKeysRepository } from "#/infrastructure/databases/repositories/postgres/postgres-idempotency-keys-repository.js";
import { PostgresOrderRepository } from "#/infrastructure/databases/repositories/postgres/postgres-order-repository.js";
import { PostgresProductRepository } from "#/infrastructure/databases/repositories/postgres/postgres-product-repository.js";
import { PostgresRatingRepository } from "#/infrastructure/databases/repositories/postgres/postgres-rating-repository.js";
import { PostgresUserRepository } from "#/infrastructure/databases/repositories/postgres/postgres-user-repository.js";
import { BrevoEmailGateway } from "#/infrastructure/gateways/brevo-email-gateway.js";
import { FetchHttpClient } from "#/infrastructure/http/client/fetch-http-client.js";
import { Container } from "./container.js";
import { registerSharedInfrastructure } from "./shared-registry.js";
import {
  DB,
  EMAIL_GATEWAY,
  EMAIL_QUEUE_ORDER_CANCELLED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_CONFIRMED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_CREATED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_DELIVERED_HANDLER_SERVICE,
  EMAIL_QUEUE_ORDER_RETURNED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_APPROVED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_REJECTED_HANDLER_SERVICE,
  EMAIL_QUEUE_RATING_SUBMITTED_HANDLER_SERVICE,
  EMAIL_QUEUE_USER_REGISTERED_HANDLER_SERVICE,
  HTTP_CLIENT,
  IDEMPOTENCY_KEYS_REPOSITORY,
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
  RATING_REPOSITORY,
  USER_QUERIES,
  USER_REPOSITORY,
} from "./tokens.js";

export function buildEmailQueueHandlerContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  container.register(
    IDEMPOTENCY_KEYS_REPOSITORY,
    (scope) => new PostgresIdempotencyKeysRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    ORDER_REPOSITORY,
    (scope) => new PostgresOrderRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    PRODUCT_REPOSITORY,
    (scope) => new PostgresProductRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    USER_REPOSITORY,
    (scope) => new PostgresUserRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    RATING_REPOSITORY,
    (scope) => new PostgresRatingRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    USER_QUERIES,
    (scope) => new PostgresUserQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    HTTP_CLIENT,
    () => new FetchHttpClient(15000),
    "singleton",
  );

  container.register(
    EMAIL_GATEWAY,
    (scope) =>
      new BrevoEmailGateway(
        scope.resolve(HTTP_CLIENT),
        env.BREVO_BASE_URL,
        env.BREVO_API_KEY,
      ),
    "singleton",
  );

  container.register(
    EMAIL_QUEUE_ORDER_CREATED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueOrderCreatedHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMAIL_QUEUE_ORDER_CANCELLED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueOrderCancelledHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMAIL_QUEUE_ORDER_CONFIRMED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueOrderConfirmedHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMAIL_QUEUE_ORDER_DELIVERED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueOrderDeliveredHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMAIL_QUEUE_ORDER_RETURNED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueOrderReturnedHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMAIL_QUEUE_RATING_APPROVED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueRatingApprovedHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(RATING_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMAIL_QUEUE_RATING_REJECTED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueRatingRejectedHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(RATING_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMAIL_QUEUE_RATING_SUBMITTED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueRatingSubmittedHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_QUERIES),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(RATING_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMAIL_QUEUE_USER_REGISTERED_HANDLER_SERVICE,
    (scope) =>
      new EmailQueueUserRegisteredHandlerService(
        scope.resolve(DB),
        scope.resolve(EMAIL_GATEWAY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  return container;
}
