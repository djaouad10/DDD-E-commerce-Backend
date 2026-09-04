type UpdateShippingDetailsCommandData = {
  clientName: string;
  phone: string;
  phone2?: string | null;
  address: string;
  note?: string | null;
  isFragile: boolean;
  gpsLink?: string | null;
};

export class UpdateShippingDetailsCommand {
  constructor(
    public readonly orderId: string,
    public readonly data: UpdateShippingDetailsCommandData,
  ) {}
}
