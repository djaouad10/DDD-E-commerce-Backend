import { ShippingProvider } from "#/domain/entities/order.js";
import { DeliveryType } from "#/domain/value-objects/shipping-details.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import { isValidUUID } from "#/shared/utils/validator.js";

type CreateOrderCommandShippingDetails = {
  fullName: string;
  firstPhone: string;
  secondPhone?: string | undefined;
  wilayaCode: number;
  commune: string;
  postalCode: string;
  address: string;
  gpsLink?: string | undefined;
  clientNote?: string | undefined;
  deliveryType: DeliveryType;
  fragile: boolean;
};

export class CreateOrderCommand {
  constructor(
    public readonly idempotencyKey: string,
    public readonly userId: string,
    public readonly providedShippingPrice: number,
    public readonly selectedShippingProvider: ShippingProvider,
    public readonly shippingDetails: CreateOrderCommandShippingDetails,
  ) {
    this.validate();
  }

  private validate() {
    if (!isValidUUID(this.idempotencyKey))
      throw new ValidationError(
        "idempotencyKey",
        "idempotencyKey must be a valid UUID",
      );

    if (this.providedShippingPrice < 0)
      throw new ValidationError(
        "providedShippingPrice",
        "providedShippingPrice must be greater than 0",
      );

    if (
      !Object.values(ShippingProvider).includes(this.selectedShippingProvider)
    )
      throw new ValidationError("selectedShippingProvider", "invalid provider");

    if (
      !Object.values(DeliveryType).includes(this.shippingDetails.deliveryType)
    )
      throw new ValidationError("deliveryType", "invalid delivery type");

    if (
      this.shippingDetails.wilayaCode < 1 ||
      this.shippingDetails.wilayaCode > 69
    )
      // Algeria has 69 wilayas
      throw new ValidationError("wilayaCode", "invalid wilaya code");
  }
}
