import type { OrderItemDTO } from "#/application/dto/order-item.dto.js";
import { Money } from "../value-objects/money.js";
import { OrderItemId } from "../value-objects/order-item-id.js";
import type { VariationId } from "../value-objects/variation-id.js";
import type { Weight } from "../value-objects/weight.js";

export class OrderItem {
  private constructor(
    readonly id: OrderItemId,
    readonly variationId: VariationId,
    readonly qty: number,
    readonly unitPriceAtOrderTime: Money,
    readonly unitDiscountPriceAtOrderTime: Money | null,
    readonly weightAtOrderTime: Weight,
  ) {}

  static create(
    variationId: VariationId,
    qty: number,
    unitPriceAtOrderTime: Money,
    weightAtOrderTime: Weight,
    unitDiscountPriceAtOrderTime: Money | null,
  ): OrderItem {
    if (qty <= 0) throw new Error("qty must be greater than 0");

    return new OrderItem(
      OrderItemId.generate(),
      variationId,
      qty,
      unitPriceAtOrderTime,
      unitDiscountPriceAtOrderTime,
      weightAtOrderTime,
    );
  }
  // everything is immutable and readonly we don't need a static factory method

  // query methods
  getVariationId(): VariationId {
    return this.variationId;
  }

  getQty(): number {
    return this.qty;
  }

  lineTotal(): Money {
    const price =
      this.unitDiscountPriceAtOrderTime ?? this.unitPriceAtOrderTime;
    return price.multiply(this.qty);
  }

  totalWeightInGrams(): Weight {
    return this.weightAtOrderTime.multiply(this.qty);
  }

  discountAmount(): Money {
    if (this.hasDiscount()) {
      const difference = this.unitPriceAtOrderTime.subtract(
        this.unitDiscountPriceAtOrderTime!,
      );

      return difference.multiply(this.qty);
    }

    return Money.of(0);
  }

  hasDiscount(): boolean {
    return this.unitDiscountPriceAtOrderTime !== null;
  }

  // mappers
  toDTO(): OrderItemDTO {
    return {
      id: this.id.value,
      variationId: this.variationId.value,
      qty: this.qty,
      unitPriceAtOrderTime: this.unitPriceAtOrderTime.toDTO(),
      unitDiscountPriceAtOrderTime:
        this.unitDiscountPriceAtOrderTime?.toDTO() ?? null,
      weightAtOrderTime: this.weightAtOrderTime.toDTO(),
      lineTotal: this.lineTotal().toDTO(),
      discountAmount: this.discountAmount()?.toDTO() ?? null,
      totalWeightInGrams: this.totalWeightInGrams().toDTO(),
      hasDiscount: this.hasDiscount(),
    };
  }
}
