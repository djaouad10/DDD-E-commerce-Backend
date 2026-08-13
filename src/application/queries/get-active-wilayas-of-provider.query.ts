import type { ShippingProvider } from "#/domain/entities/order.js";

export class GetActiveWilayasOfProviderQuery {
  constructor(public readonly provider: ShippingProvider) {}
}
