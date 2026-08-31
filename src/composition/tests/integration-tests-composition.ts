import { createDb } from "#/infrastructure/config/database.js";
import { env } from "#/infrastructure/config/env.js";
import { createRedisConnection } from "#/infrastructure/config/redis-connection.js";
import { Container } from "../container.js";

import { PostgresCartQueries } from "#/infrastructure/databases/read-models/postgres/postgres-cart-queries.js";
import { PostgresCategoryQueries } from "#/infrastructure/databases/read-models/postgres/postgres-category-queries.js";
import { PostgresOrderQueries } from "#/infrastructure/databases/read-models/postgres/postgres-order-queries.js";
import { PostgresProductQueries } from "#/infrastructure/databases/read-models/postgres/postgres-product-queries.js";
import { PostgresRatingQueries } from "#/infrastructure/databases/read-models/postgres/postgres-rating-queries.js";
import { PostgresUserQueries } from "#/infrastructure/databases/read-models/postgres/postgres-user-queries.js";
import { PostgresCartRepository } from "#/infrastructure/databases/repositories/postgres/postgres-cart-repository.js";
import { PostgresCategoryRepository } from "#/infrastructure/databases/repositories/postgres/postgres-category-repository.js";
import { PostgresOrderRepository } from "#/infrastructure/databases/repositories/postgres/postgres-order-repository.js";
import { PostgresOutboxRepository } from "#/infrastructure/databases/repositories/postgres/postgres-outbox-repository.js";
import { PostgresProductRepository } from "#/infrastructure/databases/repositories/postgres/postgres-product-repository.js";
import { PostgresRatingRepository } from "#/infrastructure/databases/repositories/postgres/postgres-rating-repository.js";
import { PostgresUserRepository } from "#/infrastructure/databases/repositories/postgres/postgres-user-repository.js";

import {
  CART_QUERIES,
  CART_REPOSITORY,
  CATEGORY_QUERIES,
  CATEGORY_REPOSITORY,
  DB,
  ORDER_QUERIES,
  ORDER_REPOSITORY,
  OUTBOX_REPOSITORY,
  PRODUCT_QUERIES,
  PRODUCT_REPOSITORY,
  RATING_QUERIES,
  RATING_REPOSITORY,
  USER_QUERIES,
  USER_REPOSITORY,
  GET_CATEGORIES_SERVICE,
  REDIS,
  FILE_STORE_GATEWAY,
  SHIPPING_PROVIDER_GATEWAY,
  UTAPI,
  HTTP_CLIENT,
  AUTH,
  CREATE_CATEGORY_SERVICE,
  UPDATE_CATEGORY_SERVICE,
  DELETE_CATEGORY_SERVICE,
  GET_USER_CART_SERVICE,
  UPDATE_CART_ITEM_SERVICE,
  DELETE_CART_ITEM_SERVICE,
  CLEAR_CART_SERVICE,
  ADD_ITEM_TO_CART_SERVICE,
  GET_CLIENT_PROFILE_SERVICE,
  GET_CLIENT_BAN_STATUS_SERVICE,
  GET_CLIENTS_LIST_SERVICE,
  UPDATE_PRODUCT_MAIN_IMAGE_SERVICE,
  DELETE_PRODUCT_IMAGE_SERVICE,
  GET_PRODUCT_VARIATIONS_SERVICE,
  GET_PRODUCT_VARIATIONS_WITH_CART_FLAG_SERVICE,
  GET_PRODUCTS_SERVICE,
  GET_LOW_STOCK_PRODUCTS_SERVICE,
  GET_PRODUCT_STATIC_DATA_SERVICE,
  GET_APPROVED_RATINGS_OF_PRODUCT_SERVICE,
  GET_PENDING_RATINGS_OF_PRODUCT_SERVICE,
  GET_RATINGS_OF_CLIENT_SERVICE,
  DID_USER_RATE_PRODUCT_SERVICE,
  GET_ACTIVE_WILAYAS_OF_PROVIDER_SERVICE,
  GET_COMMUNES_OF_WILAYA_SERVICE,
  GET_DELIVERY_FEES_OF_WILAYA_SERVICE,
  GET_ORDERS_OF_CLIENT_SERVICE,
  GET_ORDER_BY_TRACKING_NUMBER_SERVICE,
  GET_ORDER_BY_ID_SERVICE,
  GET_ORDERS_SERVICE,
  GET_PRODUCT_UPDATE_DATA_SERVICE,
  GET_SHIPPING_LABEL_SERVICE,
  BAN_CLIENT_SERVICE,
  UNBAN_CLIENT_SERVICE,
  ADD_SECONDARY_IMAGE_TO_PRODUCT_SERVICE,
  UPDATE_VARIATION_OF_PRODUCT_SERVICE,
  CREATE_VARIATION_OF_PRODUCT_SERVICE,
  CREATE_PRODUCT_SERVICE,
  UPDATE_PRODUCT_SERVICE,
  CREATE_RATING_SERVICE,
  DELETE_RATING_SERVICE,
  APPROVE_RATING_SERVICE,
  DELETE_VARIATION_OF_PRODUCT_SERVICE,
  DELETE_PRODUCT_SERVICE,
  IDEMPOTENCY_KEYS_REPOSITORY,
  CREATE_ORDER_SERVICE,
  CANCEL_ORDER_SERVICE,
  CONFIRM_ORDER_SERVICE,
  SHIP_ORDER_SERVICE,
  UPDATE_SHIPPING_DETAILS_SERVICE,
  UPDATE_CLIENT_PROFILE_SERVICE,
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
  CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
  CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE,
  DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
  UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
  CLEAN_OUTBOX_SERVICE,
  OUTBOX_QUEUE,
  OUTBOX_PROCESSOR_SERVICE,
  ANALYTICS_QUEUE,
  INVENTORY_QUEUE,
  BULLMQ_FLOW_PRODUCER,
  EMAIL_QUEUE,
  DOMAIN_EVENTS_PROCESSOR_SERVICE,
  EVENT_PUBLISHER,
} from "../tokens.js";
import GetCategoriesService from "#/application/services/get-categories.service.js";
import { UTApi } from "uploadthing/server";
import { UploadthingFileStoreGateway } from "#/infrastructure/gateways/uploadthing-file-store-gateway.js";
import { WorldExpressShippingProviderGateway } from "#/infrastructure/gateways/world-express-shipping-provider-gateway.js";
import { FetchHttpClient } from "#/infrastructure/http/client/fetch-http-client.js";
import { fakeAuth } from "#/tests/helpers/fake-auth.js";
import { CreateCategoryService } from "#/application/services/create-category.service.js";
import { UpdateCategoryService } from "#/application/services/update-category.service.js";
import { DeleteCategoryService } from "#/application/services/delete-category.service.js";
import { GetUserCartService } from "#/application/services/get-user-cart.service.js";
import { UpdateCartItemService } from "#/application/services/update-cart-item.service.js";
import { DeleteCartItemService } from "#/application/services/delete-cart-item.service.js";
import { ClearCartService } from "#/application/services/clear-cart.service.js";
import { AddItemToCartService } from "#/application/services/add-item-to-cart.service.js";
import { GetClientProfileService } from "#/application/services/get-client-profile.service.js";
import { GetClientBanStatusService } from "#/application/services/get-client-ban-status.service.js";
import { GetClientsListService } from "#/application/services/get-clients-list.service.js";
import { UpdateProductMainImageService } from "#/application/services/update-product-main-image.service.js";
import { DeleteProductImageService } from "#/application/services/delete-product-image.service.js";
import { GetProductVariationsService } from "#/application/services/get-product-variations.service.js";
import { GetProductVariationsWithCartFlagService } from "#/application/services/get-product-variations-with-cart-flag.service.js";
import { GetProductsService } from "#/application/services/get-products.service.js";
import { GetLowStockProductsService } from "#/application/services/get-low-stock-products.service.js";
import { GetProductStaticDataService } from "#/application/services/get-product-static-data.service.js";
import { GetApprovedRatingsOfProductService } from "#/application/services/get-approved-ratings-of-product.service.js";
import { GetPendingRatingsOfProductService } from "#/application/services/get-pending-ratings-of-product.service.js";
import { GetRatingsOfClientService } from "#/application/services/get-ratings-of-client.service.js";
import { DidUserRateProductService } from "#/application/services/did-user-rate-product.service.js";
import { GetActiveWilayasOfProviderService } from "#/application/services/get-active-wilayas-of-provider.service.js";
import { GetCommunesOfWilayaService } from "#/application/services/get-communes-of-wilaya.service.js";
import { GetDeliveryFeesOfWilayaService } from "#/application/services/get-delivery-fees-of-wilaya.service.js";
import { GetOrdersOfClientService } from "#/application/services/get-orders-of-client.service.js";
import { GetOrderByTrackingNumberService } from "#/application/services/get-order-by-tracking-number.service.js";
import { GetOrderByIdService } from "#/application/services/get-order-by-id.service.js";
import { GetOrdersService } from "#/application/services/get-orders.service.js";
import { GetProductUpdateDataService } from "#/application/services/get-product-update-data.service.js";
import { GetShippingLabelService } from "#/application/services/get-shipping-label.service.js";
import { BanClientService } from "#/application/services/ban-client.service.js";
import { UnbanClientService } from "#/application/services/unban-client.service.js";
import { AddSecondaryImageToProductService } from "#/application/services/add-secondary-image-to-product.service.js";
import { UpdateVariationOfProductService } from "#/application/services/update-variation-of-product.service.js";
import { CreateVariationOfProductService } from "#/application/services/create-variation-of-product.service.js";
import { CreateProductService } from "#/application/services/create-product-service.js";
import { UpdateProductService } from "#/application/services/update-product.service.js";
import { CreateRatingService } from "#/application/services/create-rating.service.js";
import { DeleteRatingService } from "#/application/services/delete-rating.service.js";
import { ApproveRatingService } from "#/application/services/approve-rating.service.js";
import { DeleteVariationOfProductService } from "#/application/services/delete-variation-of-product.service.js";
import { DeleteProductService } from "#/application/services/delete-product.service.js";
import { PostgresIdempotencyKeysRepository } from "#/infrastructure/databases/repositories/postgres/postgres-idempotency-keys-repository.js";
import { CreateOrderService } from "#/application/services/create-order-service.js";
import { CancelOrderService } from "#/application/services/cancel-order.service.js";
import { ConfirmOrderService } from "#/application/services/confirm-order.service.js";
import { ShipOrderService } from "#/application/services/ship-order.service.js";
import { UpdateShippingDetailsService } from "#/application/services/update-shipping-details.service.js";
import { UpdateClientProfileService } from "#/application/services/update-client-profile.service.js";
import { EmailQueueOrderCancelledHandlerService } from "#/application/services/event-handlers/email-queue-order-cancelled-handler.service.js";
import { EmailQueueOrderConfirmedHandlerService } from "#/application/services/event-handlers/email-queue-order-confirmed-handler.service.js";
import { EmailQueueOrderCreatedHandlerService } from "#/application/services/event-handlers/email-queue-order-created-handler.service.js";
import { EmailQueueOrderDeliveredHandlerService } from "#/application/services/event-handlers/email-queue-order-delivered-handler.service.js";
import { EmailQueueOrderReturnedHandlerService } from "#/application/services/event-handlers/email-queue-order-returned-handler.service.js";
import { EmailQueueRatingApprovedHandlerService } from "#/application/services/event-handlers/email-queue-rating-approved-handler.service.js";
import { EmailQueueRatingRejectedHandlerService } from "#/application/services/event-handlers/email-queue-rating-rejected-handler.service.js";
import { EmailQueueRatingSubmittedHandlerService } from "#/application/services/event-handlers/email-queue-rating-submitted-handler.service.js";
import { EmailQueueUserRegisteredHandlerService } from "#/application/services/event-handlers/email-queue-user-registered-handler.service.js";
import { BrevoEmailGateway } from "#/infrastructure/gateways/brevo-email-gateway.js";
import { CreateOrderInShippingProviderService } from "#/application/services/create-order-in-shipping-provider.service.js";
import { ActivateShipmentInShippingProviderService } from "#/application/services/activate-shipment-in-shipping-provider.service.js";
import { DeleteOrderFromShippingProviderService } from "#/application/services/delete-order-from-shipping-provider.service.js";
import { UpdateOrderInShippingProviderService } from "#/application/services/update-order-in-shipping-provider.service.js";
import { CleanOutboxService } from "#/application/services/clean-outbox.service.js";
import { createBullMqOutboxQueue } from "#/infrastructure/messaging/bullmq/queue/outbox.queue.js";
import { OutboxProcessorService } from "#/application/services/outbox-processor.service.js";
import { createBullMqAnalyticsQueue } from "#/infrastructure/messaging/bullmq/queue/analytics.queue.js";
import { createBullMqInventoryQueue } from "#/infrastructure/messaging/bullmq/queue/inventory.queue.js";
import { createBullMqFlowProducer } from "#/infrastructure/messaging/bullmq/utils/bullmq-flow-producer.js";
import { createBullMqEmailQueue } from "#/infrastructure/messaging/bullmq/queue/email.queue.js";
import { DomainEventsProcessorService } from "#/application/services/domain-events-processor.service.js";
import { BullMqEventPublisher } from "#/infrastructure/messaging/bullmq/bullmq-event-publisher.js";

export function buildIntegrationTestsContainer(): Container {
  const container = new Container();

  const testDb = createDb({ connectionUrl: env.DATABASE_URL, maxPoolSize: 1 });

  container.registerInstance(DB, testDb);

  const testRedis = createRedisConnection({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  container.registerInstance(REDIS, testRedis);

  container.register(
    OUTBOX_QUEUE,
    (scope) => createBullMqOutboxQueue(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    EMAIL_QUEUE,
    (scope) => createBullMqEmailQueue(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    ANALYTICS_QUEUE,
    (scope) => createBullMqAnalyticsQueue(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    INVENTORY_QUEUE,
    (scope) => createBullMqInventoryQueue(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    BULLMQ_FLOW_PRODUCER,
    (scope) => createBullMqFlowProducer(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    EVENT_PUBLISHER,
    (scope) =>
      new BullMqEventPublisher(
        scope.resolve(BULLMQ_FLOW_PRODUCER),
        scope.resolve(EMAIL_QUEUE),
        scope.resolve(INVENTORY_QUEUE),
        scope.resolve(ANALYTICS_QUEUE),
      ),
    "singleton",
  );

  // register repositories (singletons)
  container.register(
    CART_REPOSITORY,
    (scope) => new PostgresCartRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    CATEGORY_REPOSITORY,
    (scope) => new PostgresCategoryRepository(scope.resolve(DB)),
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
    RATING_REPOSITORY,
    (scope) => new PostgresRatingRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    USER_REPOSITORY,
    (scope) => new PostgresUserRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    OUTBOX_REPOSITORY,
    (scope) => new PostgresOutboxRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    IDEMPOTENCY_KEYS_REPOSITORY,
    (scope) => new PostgresIdempotencyKeysRepository(scope.resolve(DB)),
    "singleton",
  );

  // register read models (singletons)
  container.register(
    CART_QUERIES,
    (scope) => new PostgresCartQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    CATEGORY_QUERIES,
    (scope) => new PostgresCategoryQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    ORDER_QUERIES,
    (scope) => new PostgresOrderQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    PRODUCT_QUERIES,
    (scope) => new PostgresProductQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    RATING_QUERIES,
    (scope) => new PostgresRatingQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    USER_QUERIES,
    (scope) => new PostgresUserQueries(scope.resolve(DB)),
    "singleton",
  );

  // register gateways and http client
  container.register(HTTP_CLIENT, () => new FetchHttpClient(5000), "singleton");

  const utApi = new UTApi({});
  container.registerInstance(UTAPI, utApi);

  container.register(
    FILE_STORE_GATEWAY,
    (scope) => new UploadthingFileStoreGateway(scope.resolve(UTAPI)),
    "scoped",
  );

  container.register(
    SHIPPING_PROVIDER_GATEWAY,
    (scope) =>
      new WorldExpressShippingProviderGateway(
        scope.resolve(HTTP_CLIENT),
        env.WORLD_EXPRESS_API_URL,
        env.WORLD_EXPRESS_API_KEY,
      ),
    "scoped",
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

  // other

  container.register(AUTH, () => fakeAuth, "singleton");

  // register services
  container.register(
    GET_CATEGORIES_SERVICE,
    (scope) => new GetCategoriesService(scope.resolve(CATEGORY_QUERIES)),
    "scoped",
  );

  container.register(
    CREATE_CATEGORY_SERVICE,
    (scope) =>
      new CreateCategoryService(
        scope.resolve(DB),
        scope.resolve(CATEGORY_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_CATEGORY_SERVICE,
    (scope) =>
      new UpdateCategoryService(
        scope.resolve(DB),
        scope.resolve(CATEGORY_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_CATEGORY_SERVICE,
    (scope) =>
      new DeleteCategoryService(
        scope.resolve(DB),
        scope.resolve(CATEGORY_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_USER_CART_SERVICE,
    (scope) =>
      new GetUserCartService(
        scope.resolve(CART_QUERIES),
        scope.resolve(USER_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_CART_ITEM_SERVICE,
    (scope) =>
      new UpdateCartItemService(
        scope.resolve(DB),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_CART_ITEM_SERVICE,
    (scope) =>
      new DeleteCartItemService(
        scope.resolve(DB),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CLEAR_CART_SERVICE,
    (scope) =>
      new ClearCartService(
        scope.resolve(DB),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    ADD_ITEM_TO_CART_SERVICE,
    (scope) =>
      new AddItemToCartService(
        scope.resolve(DB),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_CLIENT_PROFILE_SERVICE,
    (scope) => new GetClientProfileService(scope.resolve(USER_REPOSITORY)),
    "scoped",
  );

  container.register(
    GET_CLIENT_BAN_STATUS_SERVICE,
    (scope) => new GetClientBanStatusService(scope.resolve(USER_REPOSITORY)),
    "scoped",
  );

  container.register(
    GET_CLIENTS_LIST_SERVICE,
    (scope) => new GetClientsListService(scope.resolve(USER_QUERIES)),
    "scoped",
  );

  container.register(
    UPDATE_PRODUCT_MAIN_IMAGE_SERVICE,
    (scope) =>
      new UpdateProductMainImageService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_PRODUCT_IMAGE_SERVICE,
    (scope) =>
      new DeleteProductImageService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_PRODUCT_VARIATIONS_SERVICE,
    (scope) =>
      new GetProductVariationsService(
        scope.resolve(PRODUCT_QUERIES),
        scope.resolve(PRODUCT_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_PRODUCT_VARIATIONS_WITH_CART_FLAG_SERVICE,
    (scope) =>
      new GetProductVariationsWithCartFlagService(
        scope.resolve(PRODUCT_QUERIES),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_PRODUCTS_SERVICE,
    (scope) => new GetProductsService(scope.resolve(PRODUCT_QUERIES)),
    "scoped",
  );

  container.register(
    GET_LOW_STOCK_PRODUCTS_SERVICE,
    (scope) => new GetLowStockProductsService(scope.resolve(PRODUCT_QUERIES)),
    "scoped",
  );

  container.register(
    GET_PRODUCT_STATIC_DATA_SERVICE,
    (scope) => new GetProductStaticDataService(scope.resolve(PRODUCT_QUERIES)),
    "scoped",
  );

  container.register(
    GET_APPROVED_RATINGS_OF_PRODUCT_SERVICE,
    (scope) =>
      new GetApprovedRatingsOfProductService(scope.resolve(RATING_QUERIES)),
    "scoped",
  );

  container.register(
    GET_PENDING_RATINGS_OF_PRODUCT_SERVICE,
    (scope) =>
      new GetPendingRatingsOfProductService(scope.resolve(RATING_QUERIES)),
    "scoped",
  );

  container.register(
    GET_RATINGS_OF_CLIENT_SERVICE,
    (scope) => new GetRatingsOfClientService(scope.resolve(RATING_QUERIES)),
    "scoped",
  );

  container.register(
    DID_USER_RATE_PRODUCT_SERVICE,
    (scope) =>
      new DidUserRateProductService(
        scope.resolve(RATING_QUERIES),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(PRODUCT_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_ACTIVE_WILAYAS_OF_PROVIDER_SERVICE,
    (scope) =>
      new GetActiveWilayasOfProviderService(
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
      ),
    "scoped",
  );

  container.register(
    GET_COMMUNES_OF_WILAYA_SERVICE,
    (scope) =>
      new GetCommunesOfWilayaService(scope.resolve(SHIPPING_PROVIDER_GATEWAY)),
    "scoped",
  );

  container.register(
    GET_DELIVERY_FEES_OF_WILAYA_SERVICE,
    (scope) =>
      new GetDeliveryFeesOfWilayaService(
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
      ),
    "scoped",
  );

  container.register(
    GET_ORDERS_OF_CLIENT_SERVICE,
    (scope) => new GetOrdersOfClientService(scope.resolve(ORDER_QUERIES)),
    "scoped",
  );

  container.register(
    GET_ORDER_BY_TRACKING_NUMBER_SERVICE,
    (scope) =>
      new GetOrderByTrackingNumberService(
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(PRODUCT_QUERIES),
      ),
    "scoped",
  );

  container.register(
    GET_ORDER_BY_ID_SERVICE,
    (scope) =>
      new GetOrderByIdService(
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(PRODUCT_QUERIES),
      ),
    "scoped",
  );

  container.register(
    GET_ORDERS_SERVICE,
    (scope) => new GetOrdersService(scope.resolve(ORDER_QUERIES)),
    "scoped",
  );

  container.register(
    GET_PRODUCT_UPDATE_DATA_SERVICE,
    (scope) =>
      new GetProductUpdateDataService(
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(CATEGORY_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_SHIPPING_LABEL_SERVICE,
    (scope) =>
      new GetShippingLabelService(scope.resolve(SHIPPING_PROVIDER_GATEWAY)),
    "scoped",
  );

  container.register(
    BAN_CLIENT_SERVICE,
    (scope) =>
      new BanClientService(
        scope.resolve(DB),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UNBAN_CLIENT_SERVICE,
    (scope) =>
      new UnbanClientService(
        scope.resolve(DB),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    ADD_SECONDARY_IMAGE_TO_PRODUCT_SERVICE,
    (scope) =>
      new AddSecondaryImageToProductService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_VARIATION_OF_PRODUCT_SERVICE,
    (scope) =>
      new UpdateVariationOfProductService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CREATE_VARIATION_OF_PRODUCT_SERVICE,
    (scope) =>
      new CreateVariationOfProductService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CREATE_PRODUCT_SERVICE,
    (scope) =>
      new CreateProductService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_PRODUCT_SERVICE,
    (scope) =>
      new UpdateProductService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CREATE_RATING_SERVICE,
    (scope) =>
      new CreateRatingService(
        scope.resolve(DB),
        scope.resolve(RATING_REPOSITORY),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_RATING_SERVICE,
    (scope) =>
      new DeleteRatingService(
        scope.resolve(DB),
        scope.resolve(RATING_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    APPROVE_RATING_SERVICE,
    (scope) =>
      new ApproveRatingService(
        scope.resolve(DB),
        scope.resolve(RATING_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_VARIATION_OF_PRODUCT_SERVICE,
    (scope) =>
      new DeleteVariationOfProductService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(ORDER_QUERIES),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_PRODUCT_SERVICE,
    (scope) =>
      new DeleteProductService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(ORDER_QUERIES),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CREATE_ORDER_SERVICE,
    (scope) =>
      new CreateOrderService(
        scope.resolve(DB),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CANCEL_ORDER_SERVICE,
    (scope) =>
      new CancelOrderService(
        scope.resolve(DB),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CONFIRM_ORDER_SERVICE,
    (scope) =>
      new ConfirmOrderService(
        scope.resolve(DB),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    SHIP_ORDER_SERVICE,
    (scope) =>
      new ShipOrderService(
        scope.resolve(DB),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_SHIPPING_DETAILS_SERVICE,
    (scope) =>
      new UpdateShippingDetailsService(
        scope.resolve(DB),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_CLIENT_PROFILE_SERVICE,
    (scope) =>
      new UpdateClientProfileService(
        scope.resolve(DB),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
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

  container.register(
    CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new CreateOrderInShippingProviderService(
        scope.resolve(DB),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new DeleteOrderFromShippingProviderService(
        scope.resolve(DB),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new UpdateOrderInShippingProviderService(
        scope.resolve(DB),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new ActivateShipmentInShippingProviderService(
        scope.resolve(DB),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CLEAN_OUTBOX_SERVICE,
    (scope) =>
      new CleanOutboxService(
        scope.resolve(DB),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    OUTBOX_PROCESSOR_SERVICE,
    (scope) =>
      new OutboxProcessorService(
        scope.resolve(OUTBOX_REPOSITORY),
        scope.resolve(OUTBOX_QUEUE),
      ),
    "scoped",
  );

  container.register(
    DOMAIN_EVENTS_PROCESSOR_SERVICE,
    (scope) =>
      new DomainEventsProcessorService(
        scope.resolve(OUTBOX_REPOSITORY),
        scope.resolve(EVENT_PUBLISHER),
      ),
    "scoped",
  );

  return container;
}
