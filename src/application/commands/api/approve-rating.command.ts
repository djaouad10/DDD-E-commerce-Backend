export class ApproveRatingCommand {
  constructor(
    public readonly productId: string,
    public readonly clientId: string,
  ) {}
}
