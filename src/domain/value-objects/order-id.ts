import { ValidationError } from "#/shared/errors/domain-error.js";

export class OrderId {
  private constructor(readonly value: string) {}

  static generate(): OrderId {
    return new OrderId(`ord_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): OrderId {
    if (!value.startsWith("ord_")) {
      throw new ValidationError("order ID", "must start with ord_");
    }

    return new OrderId(value);
  }

  equals(other: OrderId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
