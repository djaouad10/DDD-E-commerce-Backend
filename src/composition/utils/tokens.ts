import type { CartQueries } from "#/application/read-models/cart.queries.js";
import type { CategoryQueries } from "#/application/read-models/category.queries.js";
import type { OrderQueries } from "#/application/read-models/order.queries.js";
import type { ProductQueries } from "#/application/read-models/product.queries.js";
import type { RatingQueries } from "#/application/read-models/rating.queries.js";
import type { UserQueries } from "#/application/read-models/user.queries.js";
import type { OutboxRepository } from "#/application/ports/persistence/outbox.repository.port.js";
import type { FileStoreGateway } from "#/domain/gateways/file-store.gateway.js";
import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import type { UTApi } from "uploadthing/server";
import type { InjectionToken } from "./container.js";
import type { HttpClient } from "#/infrastructure/http/client/http-client.js";
import { Redis } from "ioredis";
import type { FlowProducer, Queue } from "bullmq";
import type { OutboxProcessorService } from "#/application/services/outbox-processor/outbox-processor.service.js";
import type { EventPublisher } from "#/application/ports/messaging/event-publisher.port.js";
import type { DomainEventsProcessorService } from "#/application/services/domain-events-processor/domain-events-processor.service.js";
import type { IdempotencyKeysRepository } from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import type { CreateOrderInShippingProviderService } from "#/application/services/outbox-handlers/create-order-in-shipping-provider.service.js";
import type { DeleteOrderFromShippingProviderService } from "#/application/services/outbox-handlers/delete-order-from-shipping-provider.service.js";
import type { UpdateOrderInShippingProviderService } from "#/application/services/outbox-handlers/update-order-in-shipping-provider.service.js";
import type { ActivateShipmentInShippingProviderService } from "#/application/services/outbox-handlers/activate-shipment-in-shipping-provider.service.js";
import type { Auth } from "#/infrastructure/config/auth.js";
import type GetCategoriesService from "#/application/services/api/get-categories.service.js";
import type { CreateCategoryService } from "#/application/services/api/create-category.service.js";
import type { UpdateCategoryService } from "#/application/services/api/update-category.service.js";
import type { DeleteCategoryService } from "#/application/services/api/delete-category.service.js";
import type { GetUserCartService } from "#/application/services/api/get-user-cart.service.js";
import type { UpdateCartItemService } from "#/application/services/api/update-cart-item.service.js";
import type { DeleteCartItemService } from "#/application/services/api/delete-cart-item.service.js";
import type { ClearCartService } from "#/application/services/api/clear-cart.service.js";
import type { AddItemToCartService } from "#/application/services/api/add-item-to-cart.service.js";
import type { GetClientProfileService } from "#/application/services/api/get-client-profile.service.js";
import type { GetClientBanStatusService } from "#/application/services/api/get-client-ban-status.service.js";
import type { GetClientsListService } from "#/application/services/api/get-clients-list.service.js";
import type { UpdateProductMainImageService } from "#/application/services/api/update-product-main-image.service.js";
import type { DeleteProductImageService } from "#/application/services/api/delete-product-image.service.js";
import type { GetProductVariationsService } from "#/application/services/api/get-product-variations.service.js";
import type { GetProductVariationsWithCartFlagService } from "#/application/services/api/get-product-variations-with-cart-flag.service.js";
import type { GetProductsService } from "#/application/services/api/get-products.service.js";
import type { GetLowStockProductsService } from "#/application/services/api/get-low-stock-products.service.js";
import type { GetProductStaticDataService } from "#/application/services/api/get-product-static-data.service.js";
import type { GetApprovedRatingsOfProductService } from "#/application/services/api/get-approved-ratings-of-product.service.js";
import type { GetPendingRatingsOfProductService } from "#/application/services/api/get-pending-ratings-of-product.service.js";
import type { GetRatingsOfClientService } from "#/application/services/api/get-ratings-of-client.service.js";
import type { DidUserRateProductService } from "#/application/services/api/did-user-rate-product.service.js";
import type { GetActiveWilayasOfProviderService } from "#/application/services/api/get-active-wilayas-of-provider.service.js";
import type { GetCommunesOfWilayaService } from "#/application/services/api/get-communes-of-wilaya.service.js";
import type { GetDeliveryFeesOfWilayaService } from "#/application/services/api/get-delivery-fees-of-wilaya.service.js";
import type { GetOrdersOfClientService } from "#/application/services/api/get-orders-of-client.service.js";
import type { GetOrderByTrackingNumberService } from "#/application/services/api/get-order-by-tracking-number.service.js";
import type { GetOrderByIdService } from "#/application/services/api/get-order-by-id.service.js";
import type { GetOrdersService } from "#/application/services/api/get-orders.service.js";
import type { GetProductUpdateDataService } from "#/application/services/api/get-product-update-data.service.js";
import type { GetShippingLabelService } from "#/application/services/api/get-shipping-label.service.js";
import type { BanClientService } from "#/application/services/api/ban-client.service.js";
import type { UnbanClientService } from "#/application/services/api/unban-client.service.js";
import type { AddSecondaryImageToProductService } from "#/application/services/api/add-secondary-image-to-product.service.js";
import type { UpdateVariationOfProductService } from "#/application/services/api/update-variation-of-product.service.js";
import type { CreateVariationOfProductService } from "#/application/services/api/create-variation-of-product.service.js";
import type { CreateProductService } from "#/application/services/api/create-product-service.js";
import type { UpdateProductService } from "#/application/services/api/update-product.service.js";
import type { CreateRatingService } from "#/application/services/api/create-rating.service.js";
import type { DeleteRatingService } from "#/application/services/api/delete-rating.service.js";
import type { ApproveRatingService } from "#/application/services/api/approve-rating.service.js";
import type { DeleteVariationOfProductService } from "#/application/services/api/delete-variation-of-product.service.js";
import type { DeleteProductService } from "#/application/services/api/delete-product.service.js";
import type { CreateOrderService } from "#/application/services/api/create-order-service.js";
import type { CancelOrderService } from "#/application/services/api/cancel-order.service.js";
import type { ConfirmOrderService } from "#/application/services/api/confirm-order.service.js";
import type { ShipOrderService } from "#/application/services/api/ship-order.service.js";
import type { UpdateShippingDetailsService } from "#/application/services/api/update-shipping-details.service.js";
import type { UpdateClientProfileService } from "#/application/services/api/update-client-profile.service.js";
import type { EmailQueueOrderCreatedHandlerService } from "#/application/services/email-queue-handlers/email-queue-order-created-handler.service.js";
import type { EmailQueueOrderConfirmedHandlerService } from "#/application/services/email-queue-handlers/email-queue-order-confirmed-handler.service.js";
import type { EmailQueueOrderCancelledHandlerService } from "#/application/services/email-queue-handlers/email-queue-order-cancelled-handler.service.js";
import type { EmailQueueOrderDeliveredHandlerService } from "#/application/services/email-queue-handlers/email-queue-order-delivered-handler.service.js";
import type { EmailQueueOrderReturnedHandlerService } from "#/application/services/email-queue-handlers/email-queue-order-returned-handler.service.js";
import type { EmailQueueRatingApprovedHandlerService } from "#/application/services/email-queue-handlers/email-queue-rating-approved-handler.service.js";
import type { EmailQueueRatingRejectedHandlerService } from "#/application/services/email-queue-handlers/email-queue-rating-rejected-handler.service.js";
import type { EmailQueueRatingSubmittedHandlerService } from "#/application/services/email-queue-handlers/email-queue-rating-submitted-handler.service.js";
import type { EmailQueueUserRegisteredHandlerService } from "#/application/services/email-queue-handlers/email-queue-user-registered-handler.service.js";
import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import type { CleanOutboxService } from "#/application/services/outbox-cleaner/clean-outbox.service.js";
import type { ResetStuckOutboxRowsService } from "#/application/services/stuck-outbox-resetter/reset-stuck-outbox-rows.service.js";
import type { DBClient } from "#/shared/types/db-client.js";

// Infrastructure tokens
export const DB = Symbol("db") as InjectionToken<DBClient>;
export const DRIZZLE_DB = Symbol(
  "drizzle-db",
) as InjectionToken<DrizzleDBClient>; // for test db helpers and drizzle specific infra helpers
export const REDIS = Symbol("redis") as InjectionToken<Redis>;
export const UTAPI = Symbol("utApi") as InjectionToken<UTApi>;
export const HTTP_CLIENT = Symbol("httpClient") as InjectionToken<HttpClient>;

// add queues and redis connection here later...

// Repository tokens
export const CART_REPOSITORY = Symbol(
  "cartRepository",
) as InjectionToken<CartRepository>;

export const CATEGORY_REPOSITORY = Symbol(
  "categoryRepository",
) as InjectionToken<CategoryRepository>;

export const ORDER_REPOSITORY = Symbol(
  "orderRepository",
) as InjectionToken<OrderRepository>;

export const PRODUCT_REPOSITORY = Symbol(
  "productRepository",
) as InjectionToken<ProductRepository>;

export const RATING_REPOSITORY = Symbol(
  "ratingRepository",
) as InjectionToken<RatingRepository>;

export const USER_REPOSITORY = Symbol(
  "userRepository",
) as InjectionToken<UserRepository>;

export const OUTBOX_REPOSITORY = Symbol(
  "outboxRepository",
) as InjectionToken<OutboxRepository>;

export const IDEMPOTENCY_KEYS_REPOSITORY = Symbol(
  "idempotencyKeysRepository",
) as InjectionToken<IdempotencyKeysRepository>;

// read model tokens
export const CART_QUERIES = Symbol(
  "cartQueries",
) as InjectionToken<CartQueries>;

export const CATEGORY_QUERIES = Symbol(
  "categoryQueries",
) as InjectionToken<CategoryQueries>;

export const ORDER_QUERIES = Symbol(
  "orderQueries",
) as InjectionToken<OrderQueries>;

export const PRODUCT_QUERIES = Symbol(
  "productQueries",
) as InjectionToken<ProductQueries>;

export const RATING_QUERIES = Symbol(
  "ratingQueries",
) as InjectionToken<RatingQueries>;

export const USER_QUERIES = Symbol(
  "userQueries",
) as InjectionToken<UserQueries>;

// gateways tokens:

export const FILE_STORE_GATEWAY = Symbol(
  "fileStoreGateway",
) as InjectionToken<FileStoreGateway>;

export const SHIPPING_PROVIDER_GATEWAY = Symbol(
  "shippingProviderGateway",
) as InjectionToken<ShippingProviderGateway>;

export const EMAIL_GATEWAY = Symbol(
  "emailGateway",
) as InjectionToken<EmailGateway>;

// Queues
export const OUTBOX_QUEUE = Symbol("outboxQueue") as InjectionToken<Queue>;

export const EMAIL_QUEUE = Symbol("emailQueue") as InjectionToken<Queue>;

export const INVENTORY_QUEUE = Symbol(
  "inventoryQueue",
) as InjectionToken<Queue>;

export const ANALYTICS_QUEUE = Symbol(
  "analyticsQueue",
) as InjectionToken<Queue>;

// ports
export const EVENT_PUBLISHER = Symbol(
  "eventPublisher",
) as InjectionToken<EventPublisher>;

// other
export const BULLMQ_FLOW_PRODUCER = Symbol(
  "bullmqFlowProducer",
) as InjectionToken<FlowProducer>;

export const AUTH = Symbol("auth") as InjectionToken<Auth>;

// services
export const OUTBOX_PROCESSOR_SERVICE = Symbol(
  "outboxProcessorService",
) as InjectionToken<OutboxProcessorService>;

export const DOMAIN_EVENTS_PROCESSOR_SERVICE = Symbol(
  "domainEventsProcessorService",
) as InjectionToken<DomainEventsProcessorService>;

export const CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE = Symbol(
  "createOrderInShippingProviderService",
) as InjectionToken<CreateOrderInShippingProviderService>;

export const DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE = Symbol(
  "deleteOrderFromShippingProviderService",
) as InjectionToken<DeleteOrderFromShippingProviderService>;

export const UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE = Symbol(
  "updateOrderInShippingProviderService",
) as InjectionToken<UpdateOrderInShippingProviderService>;

export const CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE = Symbol(
  "ActivateShipmentInShippingProviderService",
) as InjectionToken<ActivateShipmentInShippingProviderService>;

export const GET_CATEGORIES_SERVICE = Symbol(
  "getCategoriesService",
) as InjectionToken<GetCategoriesService>;

export const CREATE_CATEGORY_SERVICE = Symbol(
  "createCategoryService",
) as InjectionToken<CreateCategoryService>;

export const UPDATE_CATEGORY_SERVICE = Symbol(
  "updateCategoryService",
) as InjectionToken<UpdateCategoryService>;

export const DELETE_CATEGORY_SERVICE = Symbol(
  "deleteCategoryService",
) as InjectionToken<DeleteCategoryService>;

export const GET_USER_CART_SERVICE = Symbol(
  "getUserCartService",
) as InjectionToken<GetUserCartService>;

export const UPDATE_CART_ITEM_SERVICE = Symbol(
  "updateCartItemService",
) as InjectionToken<UpdateCartItemService>;

export const DELETE_CART_ITEM_SERVICE = Symbol(
  "deleteCartItemService",
) as InjectionToken<DeleteCartItemService>;

export const CLEAR_CART_SERVICE = Symbol(
  "clearCartService",
) as InjectionToken<ClearCartService>;

export const ADD_ITEM_TO_CART_SERVICE = Symbol(
  "addItemToCartService",
) as InjectionToken<AddItemToCartService>;

export const GET_CLIENT_PROFILE_SERVICE = Symbol(
  "getClientProfileService",
) as InjectionToken<GetClientProfileService>;

export const GET_CLIENT_BAN_STATUS_SERVICE = Symbol(
  "getClientBanStatusService",
) as InjectionToken<GetClientBanStatusService>;

export const GET_CLIENTS_LIST_SERVICE = Symbol(
  "getClientsListService",
) as InjectionToken<GetClientsListService>;

export const UPDATE_PRODUCT_MAIN_IMAGE_SERVICE = Symbol(
  "updateProductMainImageService",
) as InjectionToken<UpdateProductMainImageService>;

export const DELETE_PRODUCT_IMAGE_SERVICE = Symbol(
  "deleteProductImageService",
) as InjectionToken<DeleteProductImageService>;

export const GET_PRODUCT_VARIATIONS_SERVICE = Symbol(
  "getProductVariationsService",
) as InjectionToken<GetProductVariationsService>;

export const GET_PRODUCT_VARIATIONS_WITH_CART_FLAG_SERVICE = Symbol(
  "getProductVariationsWithCartFlagService",
) as InjectionToken<GetProductVariationsWithCartFlagService>;

export const GET_PRODUCTS_SERVICE = Symbol(
  "getProductsService",
) as InjectionToken<GetProductsService>;

export const GET_LOW_STOCK_PRODUCTS_SERVICE = Symbol(
  "getLowStockProductsService",
) as InjectionToken<GetLowStockProductsService>;

export const GET_PRODUCT_STATIC_DATA_SERVICE = Symbol(
  "getProductStaticDataService",
) as InjectionToken<GetProductStaticDataService>;

export const GET_APPROVED_RATINGS_OF_PRODUCT_SERVICE = Symbol(
  "getApprovedRatingsOfProductService",
) as InjectionToken<GetApprovedRatingsOfProductService>;

export const GET_PENDING_RATINGS_OF_PRODUCT_SERVICE = Symbol(
  "getPendingRatingsOfProductService",
) as InjectionToken<GetPendingRatingsOfProductService>;

export const GET_RATINGS_OF_CLIENT_SERVICE = Symbol(
  "getRatingsOfClientService",
) as InjectionToken<GetRatingsOfClientService>;

export const DID_USER_RATE_PRODUCT_SERVICE = Symbol(
  "didUserRateProductService",
) as InjectionToken<DidUserRateProductService>;

export const GET_ACTIVE_WILAYAS_OF_PROVIDER_SERVICE = Symbol(
  "getActiveWilayasOfProviderService",
) as InjectionToken<GetActiveWilayasOfProviderService>;

export const GET_COMMUNES_OF_WILAYA_SERVICE = Symbol(
  "getCommunesOfWilayaService",
) as InjectionToken<GetCommunesOfWilayaService>;

export const GET_DELIVERY_FEES_OF_WILAYA_SERVICE = Symbol(
  "getDeliveryFeesOfWilayaService",
) as InjectionToken<GetDeliveryFeesOfWilayaService>;

export const GET_ORDERS_OF_CLIENT_SERVICE = Symbol(
  "getOrdersOfClientService",
) as InjectionToken<GetOrdersOfClientService>;

export const GET_ORDER_BY_TRACKING_NUMBER_SERVICE = Symbol(
  "getOrderByTrackingNumberService",
) as InjectionToken<GetOrderByTrackingNumberService>;

export const GET_ORDER_BY_ID_SERVICE = Symbol(
  "GetOrderByIdService",
) as InjectionToken<GetOrderByIdService>;

export const GET_ORDERS_SERVICE = Symbol(
  "getOrderService",
) as InjectionToken<GetOrdersService>;

export const GET_PRODUCT_UPDATE_DATA_SERVICE = Symbol(
  "getProductUpdateDataService",
) as InjectionToken<GetProductUpdateDataService>;

export const GET_SHIPPING_LABEL_SERVICE = Symbol(
  "getShippingLabelService",
) as InjectionToken<GetShippingLabelService>;

export const BAN_CLIENT_SERVICE = Symbol(
  "banClientService",
) as InjectionToken<BanClientService>;

export const UNBAN_CLIENT_SERVICE = Symbol(
  "unbanClientService",
) as InjectionToken<UnbanClientService>;

export const ADD_SECONDARY_IMAGE_TO_PRODUCT_SERVICE = Symbol(
  "addSecondaryImageToProductService",
) as InjectionToken<AddSecondaryImageToProductService>;

export const UPDATE_VARIATION_OF_PRODUCT_SERVICE = Symbol(
  "updateVariationOfProductService",
) as InjectionToken<UpdateVariationOfProductService>;

export const CREATE_VARIATION_OF_PRODUCT_SERVICE = Symbol(
  "createVariationOfProductService",
) as InjectionToken<CreateVariationOfProductService>;

export const CREATE_PRODUCT_SERVICE = Symbol(
  "createProductService",
) as InjectionToken<CreateProductService>;

export const UPDATE_PRODUCT_SERVICE = Symbol(
  "updateProductService",
) as InjectionToken<UpdateProductService>;

export const CREATE_RATING_SERVICE = Symbol(
  "createRatingService",
) as InjectionToken<CreateRatingService>;

export const DELETE_RATING_SERVICE = Symbol(
  "deleteRatingService",
) as InjectionToken<DeleteRatingService>;

export const APPROVE_RATING_SERVICE = Symbol(
  "approveRatingService",
) as InjectionToken<ApproveRatingService>;

export const DELETE_VARIATION_OF_PRODUCT_SERVICE = Symbol(
  "deleteVariationOfProductService",
) as InjectionToken<DeleteVariationOfProductService>;

export const DELETE_PRODUCT_SERVICE = Symbol(
  "deleteProductService",
) as InjectionToken<DeleteProductService>;

export const CREATE_ORDER_SERVICE = Symbol(
  "createOrderService",
) as InjectionToken<CreateOrderService>;

export const CANCEL_ORDER_SERVICE = Symbol(
  "cancelOrderService",
) as InjectionToken<CancelOrderService>;

export const CONFIRM_ORDER_SERVICE = Symbol(
  "confirmOrderService",
) as InjectionToken<ConfirmOrderService>;

export const SHIP_ORDER_SERVICE = Symbol(
  "shipOrderService",
) as InjectionToken<ShipOrderService>;

export const UPDATE_SHIPPING_DETAILS_SERVICE = Symbol(
  "updateShippingDetailsService",
) as InjectionToken<UpdateShippingDetailsService>;

export const UPDATE_CLIENT_PROFILE_SERVICE = Symbol(
  "updateClientProfileService",
) as InjectionToken<UpdateClientProfileService>;

export const EMAIL_QUEUE_ORDER_CREATED_HANDLER_SERVICE = Symbol(
  "emailQueueOrderCreatedHandlerService",
) as InjectionToken<EmailQueueOrderCreatedHandlerService>;

export const EMAIL_QUEUE_ORDER_CONFIRMED_HANDLER_SERVICE = Symbol(
  "emailQueueOrderConfirmedHandlerService",
) as InjectionToken<EmailQueueOrderConfirmedHandlerService>;

export const EMAIL_QUEUE_ORDER_CANCELLED_HANDLER_SERVICE = Symbol(
  "emailQueueOrderCancelledHandlerService",
) as InjectionToken<EmailQueueOrderCancelledHandlerService>;

export const EMAIL_QUEUE_ORDER_DELIVERED_HANDLER_SERVICE = Symbol(
  "emailQueueOrderDeliveredHandlerService",
) as InjectionToken<EmailQueueOrderDeliveredHandlerService>;

export const EMAIL_QUEUE_ORDER_RETURNED_HANDLER_SERVICE = Symbol(
  "emailQueueOrderReturnedHandlerService",
) as InjectionToken<EmailQueueOrderReturnedHandlerService>;

export const EMAIL_QUEUE_RATING_APPROVED_HANDLER_SERVICE = Symbol(
  "emailQueueRatingApprovedHandlerService",
) as InjectionToken<EmailQueueRatingApprovedHandlerService>;

export const EMAIL_QUEUE_RATING_REJECTED_HANDLER_SERVICE = Symbol(
  "emailQueueRatingRejectedHandlerService",
) as InjectionToken<EmailQueueRatingRejectedHandlerService>;

export const EMAIL_QUEUE_RATING_SUBMITTED_HANDLER_SERVICE = Symbol(
  "emailQueueRatingSubmittedHandlerService",
) as InjectionToken<EmailQueueRatingSubmittedHandlerService>;

export const EMAIL_QUEUE_USER_REGISTERED_HANDLER_SERVICE = Symbol(
  "emailQueueUserRegisteredHandlerService",
) as InjectionToken<EmailQueueUserRegisteredHandlerService>;

export const CLEAN_OUTBOX_SERVICE = Symbol(
  "cleanOutboxService",
) as InjectionToken<CleanOutboxService>;

export const RESET_STUCK_OUTBOX_ROWS_SERVICE = Symbol(
  "resetStuckOutboxRowsService",
) as InjectionToken<ResetStuckOutboxRowsService>;
