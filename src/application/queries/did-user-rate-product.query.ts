export class DidUserRateProductQuery {
  constructor(
    public readonly userId: string,
    public readonly productId: string,
  ) {}
}
