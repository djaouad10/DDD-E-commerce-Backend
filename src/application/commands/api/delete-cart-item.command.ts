export class DeleteCartItemCommand {
  constructor(
    public readonly userId: string,
    public readonly itemId: string,
  ) {}
}
