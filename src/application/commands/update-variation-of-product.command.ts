import { ValidationError } from "#/shared/errors/domain-error.js";

export class UpdateVariationOfProductCommand {
  constructor(
    public readonly productId: string,
    public readonly variationId: string,
    public readonly newTotalQty?: number,
    public readonly newWeightInGrams?: number,
  ) {
    this.validate(newTotalQty, newWeightInGrams);
  }

  private validate(newTotalQty?: number, newWeightInGrams?: number) {
    if (newTotalQty && newTotalQty < 0) {
      throw new ValidationError(
        "cart.item.qty",
        "cart item qty must be greater than 0",
      );
    }
    if (newWeightInGrams && newWeightInGrams <= 0) {
      throw new ValidationError(
        "cart.item.weightInGrams",
        "cart item weightInGrams must be greater than 0",
      );
    }
  }
}
