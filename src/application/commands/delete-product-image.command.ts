export class DeleteProductImageCommand {
  constructor(
    public readonly productId: string,
    public readonly imageKey: string,
  ) {}
}
