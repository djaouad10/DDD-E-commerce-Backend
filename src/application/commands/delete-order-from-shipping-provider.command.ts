import type { ShippingProvider } from "#/domain/entities/order.js";

export class DeleteOrderFromShippingProviderCommand {
  constructor(
    public readonly trackingNumber: string,
    public readonly shippingProvider: ShippingProvider,
  ) {}
}
