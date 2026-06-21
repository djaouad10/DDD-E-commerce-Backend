export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PRE_TRANSIT"
  | "SHIPPING"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED"
  | "SUSPENDED";

export type ShippingProviderType = "WORLD_EXPRESS";

export class Order {
  private constructor(){}
}
