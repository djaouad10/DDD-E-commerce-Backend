import type { ShippingProvider } from "#/domain/entities/order.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class GetCommunesOfWilayaQuery {
  constructor(
    public readonly provider: ShippingProvider,
    public readonly wilayaCode: number,
  ) {
    this.validate();
  }

  private validate() {
    if (this.wilayaCode <= 0 || this.wilayaCode > 69) {
      throw new ValidationError("wilayaCode", "invalid wilaya code");
    }
  }
}
