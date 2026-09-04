import { ValidationError } from "#/shared/errors/domain-error.js";

export class AddItemToCartCommand {
  constructor(
    public readonly userId: string,
    public readonly variationId: string,
    public readonly qty: number,
  ) {
    this.validate();
  }

  private validate() {
    if (this.qty <= 0) {
      throw new ValidationError(
        "cart.item.qty",
        "cart item qty must be greater than 0",
      );
    }
  }
}
