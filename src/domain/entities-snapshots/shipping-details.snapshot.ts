import type { DeliveryType } from "#/domain/value-objects/shipping-details.js";

export type ShippingDetailsSnapshot = {
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
