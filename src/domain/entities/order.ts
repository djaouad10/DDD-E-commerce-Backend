import type { OrderDTO } from "#/application/dto/order.dto.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { Money } from "../value-objects/money.js";
import { OrderId } from "../value-objects/order-id.js";
import type { ShippingDetails } from "../value-objects/shipping-details.js";
import type { UserId } from "../value-objects/user-id.js";
import { Weight } from "../value-objects/weight.js";
import type { OrderItem } from "./order-item.js";

export const OrderStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PRE_TRANSIT: "PRE_TRANSIT",
  SHIPPING: "SHIPPING",
  DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
  SUSPENDED: "SUSPENDED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export type OrderStateMachine = {
  [S in OrderStatus]: readonly OrderStatus[];
};

export const orderStateMachine: OrderStateMachine = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PRE_TRANSIT", "CANCELLED"],
  PRE_TRANSIT: ["SHIPPING"],
  SHIPPING: ["SUSPENDED", "DELIVERED", "RETURNED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
  SUSPENDED: ["SHIPPING", "RETURNED"],
};

export type ShippingProviderType = "WORLD_EXPRESS";

export class Order {
  private _events: DomainEvent[] = [];

  private constructor(
    readonly id: OrderId,
    readonly userId: UserId,
    private _trackingNumber: string | null,
    private _status: OrderStatus,
    private _shippingStatus: string | null,
    private readonly _shippingPriceAtOrderTime: Money,
    private readonly _selectedShippingProvider: ShippingProviderType,
    private _shippingDetails: ShippingDetails,
    private _orderItems: OrderItem[],
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(
    userId: UserId,
    shippingDetails: ShippingDetails,
    orderItems: OrderItem[],
    shippingPriceAtOrderTime: Money,
    selectedShippingProvider: ShippingProviderType,
  ) {
    // validation then:

    const now = new Date();

    return new Order(
      OrderId.generate(),
      userId,
      null,
      OrderStatus.PENDING,
      null,
      shippingPriceAtOrderTime,
      selectedShippingProvider,
      shippingDetails,
      orderItems,
      now,
      now,
    );
  }

  static reconstitute(
    id: OrderId,
    userId: UserId,
    trackingNumber: string | null,
    status: OrderStatus,
    shippingStatus: string | null,
    shippingPriceAtOrderTime: Money,
    selectedShippingProvider: ShippingProviderType,
    shippingDetails: ShippingDetails,
    orderItems: OrderItem[],
    createdAt: Date,
    updatedAt: Date,
  ) {
    // reconstitute from DB, reuse the same ID
    // this is used by repository/mapper to reconstitute DB row => Domain object
    return new Order(
      id,
      userId,
      trackingNumber,
      status,
      shippingStatus,
      shippingPriceAtOrderTime,
      selectedShippingProvider,
      shippingDetails,
      orderItems,
      createdAt,
      updatedAt,
    );
  }

  // command methods

  confirm(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.CONFIRMED)) {
      throw new ValidationError("status", "invalid status transition");
    }

    this._status = OrderStatus.CONFIRMED;
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.CANCELLED)) {
      throw new ValidationError("status", "invalid status transition");
    }

    this._status = OrderStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  markAsPreTransit(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.PRE_TRANSIT)) {
      throw new ValidationError("status", "invalid status transition");
    }

    this._status = OrderStatus.PRE_TRANSIT;
    this._updatedAt = new Date();
  }

  setTrackingNumber(trackingNumber: string): void {
    this._trackingNumber = trackingNumber;
    this._updatedAt = new Date();
  }

  removeTrackingNumber(): void {
    this._trackingNumber = null;
    this._updatedAt = new Date();
  }

  updateShippingStatus(shippingStatus: string): void {
    this._shippingStatus = shippingStatus;
    this._updatedAt = new Date();
  }

  // query methods
  getTrackingNumber(): string | null {
    return this._trackingNumber;
  }

  getStatus(): OrderStatus {
    return this._status;
  }

  getShippingStatus(): string | null {
    return this._shippingStatus;
  }

  getShippingPriceAtOrderTime(): Money {
    return this._shippingPriceAtOrderTime;
  }

  getSelectedShippingProvider(): ShippingProviderType {
    return this._selectedShippingProvider;
  }

  hasTrackingNumber(): boolean {
    return this._trackingNumber !== null;
  }

  getTotalItemsPrice(): Money {
    let total = Money.of(0);

    for (const item of this._orderItems) {
      total = total.add(item.lineTotal());
    }

    return total;
  }

  getShippingDetails(): ShippingDetails {
    return this._shippingDetails;
  }

  getOrderItems(): OrderItem[] {
    return this._orderItems;
  }

  getTotalOrderPrice(): Money {
    return this.getTotalItemsPrice().add(this._shippingPriceAtOrderTime);
  }

  getTotalDiscount(): Money {
    let total = Money.of(0);

    for (const item of this._orderItems) {
      if (item.hasDiscount()) {
        total = total.add(item.discountAmount());
      }
    }

    return total;
  }


  getTotalWeightInGrams(): Weight {
    let total = Weight.of(0, "g");

    for (const item of this._orderItems) {
      total = total.add(item.totalWeightInGrams());
    }

    return total;
  }

  getTotalWeightInKg(): Weight {
    return this.getTotalWeightInGrams().toKg();
  }

  // mappers

  toDTO(): OrderDTO {
    return {
      id: this.id.value,
      userId: this.userId.value,
      trackingNumber: this._trackingNumber,
      status: this._status,
      shippingStatus: this._shippingStatus,
      shippingPriceAtOrderTime: this._shippingPriceAtOrderTime.toDTO(),
      selectedShippingProvider: this._selectedShippingProvider,
      shippingDetails: this._shippingDetails.toDTO(),
      orderItems: this._orderItems.map((item) => item.toDTO()),
      totalItemsPrice: this.getTotalItemsPrice().toDTO(),
      totalOrderPrice: this.getTotalOrderPrice().toDTO(),
      totalDiscount: this.getTotalDiscount().toDTO(),
      totalWeightInGrams: this.getTotalWeightInGrams().toDTO(),
      totalWeightInKg: this.getTotalWeightInKg().toDTO(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  // event methods
  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }

  peekEvents(): readonly DomainEvent[] {
    return [...this._events];
  }
}
