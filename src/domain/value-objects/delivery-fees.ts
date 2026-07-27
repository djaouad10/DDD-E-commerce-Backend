import type { Money } from "./money.js";

export class DeliveryFees {
  constructor(
    public readonly homeDeliveryFee: Money,
    public readonly stopDeskFee: Money,
  ) {}
}
