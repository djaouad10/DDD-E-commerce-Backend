import { ValidationError } from "#/shared/errors/domain-error.js";

export class OrderItemId {
  private constructor(readonly value: string) {}

  static generate(): OrderItemId {
    return new OrderItemId(`orditm_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): OrderItemId {
    if (!value.match(/^orditm_[a-zA-Z0-9]{32}$/)) {
      throw new ValidationError("orderItem.id", "invalid id format");
    }

    return new OrderItemId(value);
  }

  equals(other: OrderItemId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
