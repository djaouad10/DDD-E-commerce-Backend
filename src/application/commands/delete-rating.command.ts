export class DeleteRatingCommand {
  constructor(
    public productId: string,
    public clientId: string,
  ) {}
}
