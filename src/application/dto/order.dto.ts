import type { MoneySnapshot } from "#/domain/entities-snapshots/money.snapshot.js";
import type { WeightSnapshot } from "#/domain/entities-snapshots/weight.snapshot.js";
import type { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import type { DeliveryType } from "#/domain/value-objects/shipping-details.js";
import type { VariationDTO } from "./variation.dto.js";

export type OrderItemDTO = {
  id: string;
  variationId: VariationDTO;
  qty: number;
  unitPriceAtOrderTime: MoneySnapshot;
  unitDiscountPriceAtOrderTime: MoneySnapshot | null;
  weightAtOrderTime: WeightSnapshot;
  lineTotal: MoneySnapshot;
  discountAmount: MoneySnapshot | null;
  totalWeightInGrams: WeightSnapshot;
  hasDiscount: boolean;
};

export type ShippingDetailsDTO = {
  deliveryType: DeliveryType;
  fullName: string;
  firstPhone: string;
  secondPhone: string | null;
  wilayaCode: number;
  commune: string;
  postalCode: string;
  address: string;
  gpsLink: string | null;
  clientNote: string | null;
  fragile: boolean;
};

export type OrderDTO = {
  id: string;
  userId: string;
  trackingNumber: string | null;
  status: OrderStatus;
  shippingStatus: string | null;
  shippingPriceAtOrderTime: MoneySnapshot;
  selectedShippingProvider: ShippingProvider;
  shippingDetails: ShippingDetailsDTO;
  orderItems: OrderItemDTO[];
  totalOrderPrice: MoneySnapshot;
  totalItemsPrice: MoneySnapshot;
  totalDiscount: MoneySnapshot;
  totalWeightInGrams: WeightSnapshot;
  totalWeightInKg: WeightSnapshot;
  createdAt: string;
  updatedAt: string;
};

// add a less explicit type for search results,... etc.

export type OrderSearchResultDTO = {
  id: string;
  userId: string;
  trackingNumber: string | null;
  status: OrderStatus;
  shippingStatus: string | null;
  shippingPriceAtOrderTime: MoneySnapshot;
  selectedShippingProvider: ShippingProvider;
  createdAt: string;
  updatedAt: string;
};
