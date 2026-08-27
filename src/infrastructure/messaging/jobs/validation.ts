import { OutboxAction } from "#/application/repositories/outbox.repository.js";
import { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import { Color, Size } from "#/domain/entities/product.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { Currency } from "#/domain/value-objects/money.js";
import z from "zod";

export const outboxJobPayloadsSchemas = z.object({
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: z.object({
    orderId: z.string(),
  }),
  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: z.object({
    trackingNumber: z.string(),
  }),
  [OutboxAction.UPDATE_ORDER_IN_SHIPPING_API]: z.object({
    orderId: z.string(),
  }),
  [OutboxAction.DELETE_ORDER_IN_SHIPPING_API]: z.object({
    trackingNumber: z.string(),
    shippingProvider: z.enum(ShippingProvider),
  }),
});

export type OutboxJobPayloadType<T extends OutboxAction> = z.infer<
  typeof outboxJobPayloadsSchemas
>[T];

export const domainEventsPayloadSchemas = z.object({
  // Cart events
  [DomainEventCode.CART_CLEARED]: z.object({
    eventType: z.literal(DomainEventCode.CART_CLEARED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
  }),
  [DomainEventCode.CART_ITEM_ADDED]: z.object({
    eventType: z.literal(DomainEventCode.CART_ITEM_ADDED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    itemId: z.string(),
    variationId: z.string(),
    qty: z.number(),
  }),
  [DomainEventCode.CART_ITEM_QTY_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.CART_ITEM_QTY_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    itemId: z.string(),
    previousQty: z.number(),
    newQty: z.number(),
  }),
  [DomainEventCode.CART_ITEM_REMOVED]: z.object({
    eventType: z.literal(DomainEventCode.CART_ITEM_REMOVED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    itemId: z.string(),
  }),
  [DomainEventCode.CART_CREATED]: z.object({
    eventType: z.literal(DomainEventCode.CART_CREATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
  }),

  // Order events
  [DomainEventCode.ORDER_CREATED]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_CREATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    itemCount: z.number(),
    totalPrice: z.number(),
    currency: z.enum(Currency),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_CONFIRMED]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_CONFIRMED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    itemCount: z.number(),
    totalPrice: z.number(),
    currency: z.enum(Currency),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_CANCELLED]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_CANCELLED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
  }),
  [DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    trackingNumber: z.string(),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_MARKED_AS_SHIPPING]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_MARKED_AS_SHIPPING),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    trackingNumber: z.string(),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_DELIVERED]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_DELIVERED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    deliveredAt: z.iso.datetime().pipe(z.coerce.date()),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_RETURNED]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_RETURNED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    reason: z.string().nullable(),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_SUSPENDED]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_SUSPENDED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    previousStatus: z.enum(OrderStatus),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_RESUMED_FROM_SUSPENSION]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_RESUMED_FROM_SUSPENSION),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_SHIPPING_STATUS_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_SHIPPING_STATUS_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    shippingStatus: z.string(),
    previousStatus: z.string().nullable(),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),
  [DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    selectedShippingProvider: z.enum(ShippingProvider),
  }),

  // User events
  [DomainEventCode.USER_REGISTERED]: z.object({
    eventType: z.literal(DomainEventCode.USER_REGISTERED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
  }),
  [DomainEventCode.USER_PROFILE_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.USER_PROFILE_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    changedFields: z.array(z.string()),
  }),
  [DomainEventCode.USER_BANNED]: z.object({
    eventType: z.literal(DomainEventCode.USER_BANNED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    banReason: z.string().nullable(),
    banExpires: z.string().nullable(),
  }),
  [DomainEventCode.USER_UNBANNED]: z.object({
    eventType: z.literal(DomainEventCode.USER_UNBANNED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
  }),

  // Category events
  [DomainEventCode.CATEGORY_CREATED]: z.object({
    eventType: z.literal(DomainEventCode.CATEGORY_CREATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
  }),
  [DomainEventCode.CATEGORY_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.CATEGORY_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
  }),

  // Product events
  [DomainEventCode.PRODUCT_CREATED]: z.object({
    eventType: z.literal(DomainEventCode.PRODUCT_CREATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    name: z.string(),
    slug: z.string(),
    categoryId: z.string().nullable(),
    brand: z.string(),
    price: z.number(),
    currency: z.enum(Currency),
  }),
  [DomainEventCode.PRODUCT_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.PRODUCT_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    changedFields: z.array(z.string()),
  }),
  [DomainEventCode.PRODUCT_VARIATION_ADDED]: z.object({
    eventType: z.literal(DomainEventCode.PRODUCT_VARIATION_ADDED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    variationId: z.string(),
    size: z.enum(Size),
    color: z.enum(Color),
  }),
  [DomainEventCode.PRODUCT_VARIATION_REMOVED]: z.object({
    eventType: z.literal(DomainEventCode.PRODUCT_VARIATION_REMOVED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    variationId: z.string(),
  }),
  [DomainEventCode.PRODUCT_IMAGE_ADDED]: z.object({
    eventType: z.literal(DomainEventCode.PRODUCT_IMAGE_ADDED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    imageId: z.string(),
    isMain: z.boolean(),
  }),
  [DomainEventCode.PRODUCT_MAIN_IMAGE_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.PRODUCT_MAIN_IMAGE_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    newMainImageKey: z.string(),
    previousMainImageKey: z.string().nullable(),
  }),
  [DomainEventCode.PRODUCT_IMAGE_REMOVED]: z.object({
    eventType: z.literal(DomainEventCode.PRODUCT_IMAGE_REMOVED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    imageKey: z.string(),
  }),

  // Variation events
  [DomainEventCode.VARIATION_CREATED]: z.object({
    eventType: z.literal(DomainEventCode.VARIATION_CREATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    variationId: z.string(),
    size: z.enum(Size),
    color: z.enum(Color),
    totalQty: z.number(),
    weightInGrams: z.number(),
  }),
  [DomainEventCode.VARIATION_STOCK_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.VARIATION_STOCK_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    variationId: z.string(),
    previousTotalQty: z.number(),
    newTotalQty: z.number(),
    newAvailableQty: z.number(),
  }),
  [DomainEventCode.VARIATION_WEIGHT_UPDATED]: z.object({
    eventType: z.literal(DomainEventCode.VARIATION_WEIGHT_UPDATED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    variationId: z.string(),
    previousWeightInGrams: z.number(),
    newWeightInGrams: z.number(),
  }),
  [DomainEventCode.STOCK_RESERVED]: z.object({
    eventType: z.literal(DomainEventCode.STOCK_RESERVED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    variationId: z.string(),
    qty: z.number(),
    newAvailableQty: z.number(),
    newReservedQty: z.number(),
  }),
  [DomainEventCode.STOCK_RELEASED]: z.object({
    eventType: z.literal(DomainEventCode.STOCK_RELEASED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    variationId: z.string(),
    qty: z.number(),
    newAvailableQty: z.number(),
  }),

  // Rating events
  [DomainEventCode.RATING_SUBMITTED]: z.object({
    eventType: z.literal(DomainEventCode.RATING_SUBMITTED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    productId: z.string(),
    rating: z.number(),
    comment: z.string().nullable(),
  }),
  [DomainEventCode.RATING_APPROVED]: z.object({
    eventType: z.literal(DomainEventCode.RATING_APPROVED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    productId: z.string(),
    rating: z.number(),
  }),
  [DomainEventCode.RATING_REJECTED]: z.object({
    eventType: z.literal(DomainEventCode.RATING_REJECTED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    userId: z.string(),
    productId: z.string(),
  }),

  // File events
  [DomainEventCode.FILE_UPLOADED]: z.object({
    eventType: z.literal(DomainEventCode.FILE_UPLOADED),
    occurredOn: z.iso.datetime().pipe(z.coerce.date()),
    aggregateId: z.string(),
    productId: z.string(),
    key: z.string(),
    isMain: z.boolean(),
  }),
});

export type DomainEventsPayloadTypes = z.infer<
  typeof domainEventsPayloadSchemas
>;
