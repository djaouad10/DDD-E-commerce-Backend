export const OrderTrackingStatus = {
  ORDER_INFORMATION_RECEIVED_BY_CARRIER:
    "order_information_received_by_carrier",
  PICKED: "picked",
  DISPATCHED_TO_DRIVER: "dispatched_to_driver",
  ATTEMPT_DELIVERY: "attempt_delivery",
  RETURN_ASKED: "return_asked",
  RETURN_IN_TRANSIT: "return_in_transit",
  RETURN_RECEIVED: "Return_received",
  SUSPENDED: "suspended",
  DELIVERED: "delivered",
  PAID: "paid",
} as const;

export type OrderTrackingStatus =
  (typeof OrderTrackingStatus)[keyof typeof OrderTrackingStatus];

export class TrackingHistory {
  constructor(
    public readonly date: Date,
    public readonly time: string,
    public readonly status: OrderTrackingStatus,
    public readonly station?: string,
  ) {}
}
