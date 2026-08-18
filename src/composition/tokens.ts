import type { CartQueries } from "#/application/read-models/cart.queries.js";
import type { CategoryQueries } from "#/application/read-models/category.queries.js";
import type { OrderQueries } from "#/application/read-models/order.queries.js";
import type { ProductQueries } from "#/application/read-models/product.queries.js";
import type { RatingQueries } from "#/application/read-models/rating.queries.js";
import type { UserQueries } from "#/application/read-models/user.queries.js";
import type { OutboxRepository } from "#/application/repositories/outbox.repository.js";
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
import type { OutboxProcessorService } from "#/application/services/outbox-processor.service.js";
import type { EventPublisher } from "#/application/ports/event-publisher.port.js";
import type { DomainEventsProcessorService } from "#/application/services/domain-events-processor.service.js";
import type { IdempotencyKeysRepository } from "#/application/repositories/idempotency-keys.repository.js";
import type { CreateOrderInShippingProviderService } from "#/application/services/create-order-in-shipping-provider.service.js";
import type { DeleteOrderFromShippingProviderService } from "#/application/services/delete-order-from-shipping-provider.service.js";
import type { UpdateOrderInShippingProviderService } from "#/application/services/update-order-in-shipping-provider.service.js";
import type { CreateShipmentInShippingProviderService } from "#/application/services/create-shipment-in-shipping-provider.service.js";
import type { Auth } from "#/infrastructure/config/auth.js";
import type GetCategoriesService from "#/application/services/get-categories.service.js";
import type { CreateCategoryService } from "#/application/services/create-category.service.js";
import type { UpdateCategoryService } from "#/application/services/update-category.service.js";
import type { DeleteCategoryService } from "#/application/services/delete-category.service.js";
import type { GetUserCartService } from "#/application/services/get-user-cart.service.js";
import type { UpdateCartItemService } from "#/application/services/update-cart-item.service.js";
import type { DeleteCartItemService } from "#/application/services/delete-cart-item.service.js";
import type { ClearCartService } from "#/application/services/clear-cart.service.js";
import type { AddItemToCartService } from "#/application/services/add-item-to-cart.service.js";
import type { GetClientProfileService } from "#/application/services/get-client-profile.service.js";
import type { GetClientBanStatusService } from "#/application/services/get-client-ban-status.service.js";
import type { GetClientsListService } from "#/application/services/get-clients-list.service.js";
import type { UpdateProductMainImageService } from "#/application/services/update-product-main-image.service.js";
import type { DeleteProductImageService } from "#/application/services/delete-product-image.service.js";
import type { GetProductVariationsService } from "#/application/services/get-product-variations.service.js";
import type { GetProductVariationsWithCartFlagService } from "#/application/services/get-product-variations-with-cart-flag.service.js";
import type { GetProductsService } from "#/application/services/get-products.service.js";
import type { GetLowStockProductsService } from "#/application/services/get-low-stock-products.service.js";
import type { GetProductStaticDataService } from "#/application/services/get-product-static-data.service.js";
import type { GetApprovedRatingsOfProductService } from "#/application/services/get-approved-ratings-of-product.service.js";
import type { GetPendingRatingsOfProductService } from "#/application/services/get-pending-ratings-of-product.service.js";
import type { GetRatingsOfClientService } from "#/application/services/get-ratings-of-client.service.js";
import type { DidUserRateProductService } from "#/application/services/did-user-rate-product.service.js";
import type { GetActiveWilayasOfProviderService } from "#/application/services/get-active-wilayas-of-provider.service.js";
import type { GetCommunesOfWilayaService } from "#/application/services/get-communes-of-wilaya.service.js";
import type { GetDeliveryFeesOfWilayaService } from "#/application/services/get-delivery-fees-of-wilaya.service.js";
import type { GetOrdersOfClientService } from "#/application/services/get-orders-of-client.service.js";
import type { GetOrderByTrackingNumberService } from "#/application/services/get-order-by-tracking-number.service.js";
import type { GetOrderByIdService } from "#/application/services/get-order-by-id.service.js";
import type { GetOrdersService } from "#/application/services/get-orders.service.js";
import type { GetProductUpdateDataService } from "#/application/services/get-product-update-data.service.js";
import type { GetShippingLabelService } from "#/application/services/get-shipping-label.service.js";
import type { BanClientService } from "#/application/services/ban-client.service.js";
import type { UnbanClientService } from "#/application/services/unban-client.service.js";
import type { AddSecondaryImageToProductService } from "#/application/services/add-secondary-image-to-product.service.js";
import type { UpdateVariationOfProductService } from "#/application/services/update-variation-of-product.service.js";

// Infrastructure tokens
export const DB = Symbol("db") as InjectionToken<DrizzleDBClient>;
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
  "createShipmentInShippingProviderService",
) as InjectionToken<CreateShipmentInShippingProviderService>;

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
