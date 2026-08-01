export const DomainEventCode = {
  // Order events
  ORDER_CREATED: "order.created",
  ORDER_CONFIRMED: "order.confirmed",
  ORDER_CANCELLED: "order.cancelled",
  ORDER_MARKED_AS_PRE_TRANSIT: "order.marked-as-pre-transit",
  ORDER_MARKED_AS_SHIPPING: "order.marked-as-shipping",
  ORDER_DELIVERED: "order.delivered",
  ORDER_RETURNED: "order.returned",
  ORDER_SUSPENDED: "order.suspended",
  ORDER_RESUMED_FROM_SUSPENSION: "order.resumed-from-suspension",
  ORDER_SHIPPING_STATUS_UPDATED: "order.shipping-status-updated",

  // User events
  USER_REGISTERED: "user.registered",
  USER_PROFILE_UPDATED: "user.profile-updated",
  USER_BANNED: "user.banned",
  USER_UNBANNED: "user.unbanned",

  // Category events
  CATEGORY_CREATED: "category.created",
  CATEGORY_UPDATED: "category.updated",

  // Product events
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_VARIATION_ADDED: "product.variation-added",
  PRODUCT_VARIATION_REMOVED: "product.variation-removed",
  PRODUCT_IMAGE_ADDED: "product.image-added",
  PRODUCT_MAIN_IMAGE_UPDATED: "product.main-image-updated",
  PRODUCT_IMAGE_REMOVED: "product.image-removed",

  // Variation events
  VARIATION_CREATED: "variation.created",
  VARIATION_STOCK_UPDATED: "variation.stock-updated",
  VARIATION_WEIGHT_UPDATED: "variation.weight-updated",
  STOCK_RESERVED: "stock.reserved",
  STOCK_RELEASED: "stock.released",

  // Cart events
  CART_CREATED: "cart.created",
  CART_ITEM_ADDED: "cart.item-added",
  CART_ITEM_REMOVED: "cart.item-removed",
  CART_ITEM_QTY_UPDATED: "cart.item-qty-updated",
  CART_CLEARED: "cart.cleared",

  // Rating events
  RATING_SUBMITTED: "rating.submitted",
  RATING_APPROVED: "rating.approved",
  RATING_REJECTED: "rating.rejected",

  // File events
  FILE_UPLOADED: "file.uploaded",
} as const;

export type DomainEventCode =
  (typeof DomainEventCode)[keyof typeof DomainEventCode];

export interface DomainEvent {
  readonly eventType: DomainEventCode;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}
