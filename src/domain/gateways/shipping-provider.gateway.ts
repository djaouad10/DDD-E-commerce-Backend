import type { Order, OrderStatus } from "../entities/order.js";
import type { Commune } from "../value-objects/commune.js";
import type { DeliveryFees } from "../value-objects/delivery-fees.js";
import type { OrderId } from "../value-objects/order-id.js";
import type { TrackingHistory } from "../value-objects/tracking-history.js";
import type { Wilaya } from "../value-objects/wilaya.js";

export type ShipmentItem = {
  sku: string;
  quantity: number;
  weight_in_grams: number;
};

export type ShippingLabel = {
  buffer: Buffer;
  contentType: string;
  filename?: string | undefined;
};

export type ShippingProviderGateway = {
  getActiveWilayas: () => Promise<Wilaya[]>;

  getActiveCommunesOfWilaya: (wilayaCode: number) => Promise<Commune[]>;

  getShippingLabel: (trackingNumber: string) => Promise<ShippingLabel>;

  // purpose: tells carrier to start the shipping process for this order
  activateShipment: (trackingNumber: string) => Promise<{ success: boolean }>;

  getDeliveryFeesOfWilaya: (wilayaId: number) => Promise<DeliveryFees>;

  createShipment: (order: Order) => Promise<{ trackingNumber: string }>;

  createManyShipments: (orders: Order[]) => Promise<{
    failed: OrderId[];
    created: { orderId: OrderId; trackingNumber: string }[];
  }>;

  updateUnShippedShipment: (order: Order) => Promise<{
    success: boolean;
  }>;

  deleteUnshippedShipment: (
    trackingNumber: string,
  ) => Promise<{ success: boolean }>;

  getTrackingHistoryOfShipment: (
    trackingNumber: string,
  ) => Promise<TrackingHistory[]>;

  getOneShipmentStatus: (
    trackingNumber: string,
  ) => Promise<{ status: OrderStatus }>;

  getManyShipmentsStatuses: (
    trackingNumbers: string[],
  ) => Promise<{ trackingNumber: string; status: OrderStatus }[]>;
};
