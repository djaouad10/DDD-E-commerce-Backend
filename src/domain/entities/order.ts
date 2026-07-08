import type { OrderDTO } from "#/application/dto/order.dto.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { OrderCancelled } from "../events/order/order-cancelled.js";
import { OrderConfirmed } from "../events/order/order-confirmed.js";
import { OrderDelivered } from "../events/order/order-delivered.js";
import { OrderMarkedAsPreTransit } from "../events/order/order-marked-as-pre-transit.js";
import { OrderMarkedAsShipping } from "../events/order/order-marked-as-shipping.js";
import { OrderResumedFromSuspension } from "../events/order/order-resumed-from-suspension.js";
import { OrderReturned } from "../events/order/order-returned.js";
import { OrderShippingStatusUpdated } from "../events/order/order-shipping-status-updated.js";
import { OrderSuspended } from "../events/order/order-suspended.js";
import { Currency, Money } from "../value-objects/money.js";
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

export const ShippingProvider = { WORLD_EXPRESS: "WORLD_EXPRESS" } as const;

export type ShippingProvider =
  (typeof ShippingProvider)[keyof typeof ShippingProvider];

export class Order {
  private _events: DomainEvent[] = [];

  private constructor(
    readonly id: OrderId,
    readonly userId: UserId,
    private _trackingNumber: string | null,
    private _status: OrderStatus,
    private _shippingStatus: string | null,
    private readonly _shippingPriceAtOrderTime: Money,
    private readonly _selectedShippingProvider: ShippingProvider,
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
    selectedShippingProvider: ShippingProvider,
  ) {
    // validation then:

    if (orderItems.length === 0)
      throw new ValidationError(
        "orderItems",
        "can't pass an empty orderItems list to Order.create()",
      );

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
    selectedShippingProvider: ShippingProvider,
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

    // record the event
    this.recordThat(
      new OrderConfirmed(
        this.id.value,
        this.userId.value,
        this._orderItems.length,
        this.getTotalOrderPrice().amount,
        this.getTotalOrderPrice().currency,
        this.getSelectedShippingProvider(),
      ),
    );
  }

  cancel(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.CANCELLED)) {
      throw new ValidationError("status", "invalid status transition");
    }

    this._status = OrderStatus.CANCELLED;
    this._updatedAt = new Date();

    // record the event
    this.recordThat(new OrderCancelled(this.id.value, this.userId.value));
  }

  markAsPreTransit(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.PRE_TRANSIT)) {
      throw new ValidationError("status", "invalid status transition");
    }

    this._status = OrderStatus.PRE_TRANSIT;
    this._updatedAt = new Date();

    // record the event
    this.recordThat(
      new OrderMarkedAsPreTransit(
        this.id.value,
        this.userId.value,
        this.getTrackingNumber() || "unkown",
        this.getSelectedShippingProvider(),
      ),
    );
  }

  // In Order class
  markAsShipping(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.SHIPPING)) {
      throw new ValidationError("status", "invalid status transition");
    }
    this._status = OrderStatus.SHIPPING;
    this._updatedAt = new Date();

    // record the event
    this.recordThat(
      new OrderMarkedAsShipping(
        this.id.value,
        this.userId.value,
        this.getTrackingNumber() || "unkown",
        this.getSelectedShippingProvider(),
      ),
    );
  }

  markAsDelivered(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.DELIVERED)) {
      throw new ValidationError("status", "invalid status transition");
    }
    this._status = OrderStatus.DELIVERED;
    this._updatedAt = new Date();

    // record the event
    this.recordThat(
      new OrderDelivered(
        this.id.value,
        this.userId.value,
        new Date(),
        this.getSelectedShippingProvider(),
      ),
    );
  }

  markAsReturned(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.RETURNED)) {
      throw new ValidationError("status", "invalid status transition");
    }
    this._status = OrderStatus.RETURNED;
    this._updatedAt = new Date();

    // record the event
    this.recordThat(
      new OrderReturned(
        this.id.value,
        this.userId.value,
        null, // for now
        this.getSelectedShippingProvider(),
      ),
    );
  }

  markAsSuspended(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.SUSPENDED)) {
      throw new ValidationError("status", "invalid status transition");
    }

    const previousStatus = this._status;

    this._status = OrderStatus.SUSPENDED;
    this._updatedAt = new Date();

    // record the event
    this.recordThat(
      new OrderSuspended(
        this.id.value,
        this.userId.value,
        previousStatus,
        this.getSelectedShippingProvider(),
      ),
    );
  }

  resumeFromSuspension(): void {
    if (!orderStateMachine[this._status].includes(OrderStatus.SHIPPING)) {
      throw new ValidationError("status", "invalid status transition");
    }
    this._status = OrderStatus.SHIPPING;
    this._updatedAt = new Date();

    // record the event
    this.recordThat(
      new OrderResumedFromSuspension(
        this.id.value,
        this.userId.value,
        this.getSelectedShippingProvider(),
      ),
    );
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
    const previousShippingStatus = this._shippingStatus;

    this._shippingStatus = shippingStatus;
    this._updatedAt = new Date();

    // record the event
    this.recordThat(
      new OrderShippingStatusUpdated(
        this.id.value,
        shippingStatus,
        previousShippingStatus,
        this.getSelectedShippingProvider(),
      ),
    );
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

  getSelectedShippingProvider(): ShippingProvider {
    return this._selectedShippingProvider;
  }

  hasTrackingNumber(): boolean {
    return this._trackingNumber !== null;
  }

  getTotalItemsPrice(): Money {
    let total = Money.of(0, Currency.DZD);

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

  getCreatedAt(): Date {
    return this._createdAt;
  }

  getUpdatedAt(): Date {
    return this._updatedAt;
  }

  getTotalOrderPrice(): Money {
    return this.getTotalItemsPrice().add(this._shippingPriceAtOrderTime);
  }

  getTotalDiscount(): Money {
    let total = Money.of(0, Currency.DZD);

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

  recordThat(event: DomainEvent): void {
    this._events.push(event);
  }
}
