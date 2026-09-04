export class AddSecondaryImageToProductCommand {
  constructor(
    public readonly productId: string,
    public readonly data: {
      key: string;
      name: string;
      public_url: string;
    },
  ) {}
}
