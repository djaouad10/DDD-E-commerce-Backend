import type { ShippingProvider } from "#/domain/entities/order.js";

export class GetShippingLabelQuery {
  constructor(
    public readonly trackingNumber: string,
    public readonly provider: ShippingProvider,
  ) {}
}
