import type { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import type { MoneySnapshot } from "./money.dto.js";
import type { OrderItemSnapshot } from "./order-item.dto.js";
import type { ShippingDetailsSnapshot } from "./shipping-details.dto.js";
import type { WeightSnapshot } from "./weight.dto.js";

export type OrderSnapshot = {
  id: string;
  userId: string;
  trackingNumber: string | null;
  status: OrderStatus;
  shippingStatus: string | null;
  shippingPriceAtOrderTime: MoneySnapshot;
  selectedShippingProvider: ShippingProvider;
  shippingDetails: ShippingDetailsSnapshot;
  orderItems: OrderItemSnapshot[];
  totalOrderPrice: MoneySnapshot;
  totalItemsPrice: MoneySnapshot;
  totalDiscount: MoneySnapshot;
  totalWeightInGrams: WeightSnapshot;
  totalWeightInKg: WeightSnapshot;
  createdAt: string;
  updatedAt: string;
};
