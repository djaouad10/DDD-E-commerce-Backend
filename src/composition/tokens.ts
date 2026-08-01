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

// services
export const OUTBOX_PROCESSOR_SERVICE = Symbol(
  "outboxProcessorService",
) as InjectionToken<OutboxProcessorService>;

export const DOMAIN_EVENTS_PROCESSOR_SERVICE = Symbol(
  "domainEventsProcessorService",
) as InjectionToken<DomainEventsProcessorService>;

// ports
export const EVENT_PUBLISHER = Symbol(
  "eventPublisher",
) as InjectionToken<EventPublisher>;

// other
export const BULLMQ_FLOW_PRODUCER = Symbol(
  "bullmqFlowProducer",
) as InjectionToken<FlowProducer>;
