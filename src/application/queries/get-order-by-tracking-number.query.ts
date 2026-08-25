export class GetOrderByTrackingNumberQuery {
  constructor(
    public readonly trackingNumber: string,
    public readonly clientId?: string,
  ) {}
}
