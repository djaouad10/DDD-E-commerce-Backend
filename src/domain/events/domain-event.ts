export type DomainEventType =
  // Order events
  | "order.created"
  | "order.confirmed"
  | "order.cancelled"
  | "order.marked-as-pre-transit"
  | "order.marked-as-shipping"
  | "order.delivered"
  | "order.returned"
  | "order.suspended"
  | "order.resumed-from-suspension"
  | "order.shipping-status-updated"
  // User events
  | "user.registered"
  | "user.profile-updated"
  | "user.banned"
  | "user.unbanned"
  // Category events
  | "category.created"
  | "category.updated"
  // Product events
  | "product.created"
  | "product.updated"
  | "product.variation-added"
  | "product.variation-removed"
  | "product.image-added"
  | "product.main-image-updated"
  | "product.image-removed"
  // Variation events
  | "variation.created"
  | "variation.stock-updated"
  | "variation.weight-updated"
  | "stock.reserved"
  | "stock.released"
  // Cart events
  | "cart.created"
  | "cart.item-added"
  | "cart.item-removed"
  | "cart.item-qty-updated"
  | "cart.cleared"
  // Rating events
  | "rating.submitted"
  | "rating.approved"
  | "rating.rejected"
  // File events
  | "file.uploaded";
export interface DomainEvent {
  readonly eventType: DomainEventType;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}
