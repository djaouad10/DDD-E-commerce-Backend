export class DeleteVariationOfProductCommand {
  constructor(
    public readonly productId: string,
    public readonly variationId: string,
  ) {}
}
