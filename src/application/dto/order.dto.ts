import type {
  OrderStatus,
  ShippingProviderType,
} from "#/domain/entities/order.js";
import type { MoneyDTO } from "./money.dto.js";
import type { OrderItemDTO } from "./order-item.dto.js";
import type { ShippingDetailsDTO } from "./shipping-details.dto.js";
import type { WeightDTO } from "./weight.dto.js";

export type OrderDTO = {
  id: string;
  userId: string;
  trackingNumber: string | null;
  status: OrderStatus;
  shippingStatus: string | null;
  shippingPriceAtOrderTime: MoneyDTO;
  selectedShippingProvider: ShippingProviderType;
  shippingDetails: ShippingDetailsDTO;
  orderItems: OrderItemDTO[];
  totalOrderPrice: MoneyDTO;
  totalItemsPrice: MoneyDTO;
  totalDiscount: MoneyDTO;
  totalWeightInGrams: WeightDTO;
  createdAt: string;
  updatedAt: string;
};
