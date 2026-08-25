import type { ShippingProvider } from "#/domain/entities/order.js";

export class GetCommunesOfWilayaQuery {
  constructor(
    public readonly provider: ShippingProvider,
    public readonly wilayaCode: number,
  ) {}
}
