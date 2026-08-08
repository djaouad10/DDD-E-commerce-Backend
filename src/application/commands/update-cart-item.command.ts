export class UpdateCartItemCommand {
  constructor(
    public readonly userId: string,
    public readonly itemId: string,
    public readonly newQty: number,
  ) {
    this.validate(newQty);
  }

  private validate(newQty: number) {
    if (newQty <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
  }
}
