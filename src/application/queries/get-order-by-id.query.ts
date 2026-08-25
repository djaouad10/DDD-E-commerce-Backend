export class GetOrderByIdQuery {
  constructor(
    public readonly orderId: string,
    public readonly clientId?: string,
  ) {}
}
