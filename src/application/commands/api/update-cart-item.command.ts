import { ValidationError } from "#/shared/errors/domain-error.js";

export class UpdateCartItemCommand {
  constructor(
    public readonly userId: string,
    public readonly itemId: string,
    public readonly newQty: number,
  ) {
    this.validate();
  }

  private validate() {
    if (this.newQty <= 0) {
      throw new ValidationError(
        "cart.item.qty",
        "cart item qty must be greater than 0",
      );
    }
  }
}
