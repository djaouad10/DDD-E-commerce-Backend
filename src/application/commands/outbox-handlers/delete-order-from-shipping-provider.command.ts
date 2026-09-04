import type { ShippingProvider } from "#/domain/entities/order.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class DeleteOrderFromShippingProviderCommand {
  constructor(
    public readonly trackingNumber: string,
    public readonly shippingProvider: ShippingProvider,
  ) {
    this.validate();
  }

  private validate() {
    if (!this.trackingNumber)
      throw new ValidationError("order.trackingNumber", "trackingNumber is required");
  }
}
