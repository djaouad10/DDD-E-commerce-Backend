export class GetProductVariationsWithCartFlagQuery {
  constructor(
    public readonly productId: string,
    public readonly userId: string,
  ) {}
}
