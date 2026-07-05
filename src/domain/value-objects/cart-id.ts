import { ValidationError } from "#/shared/errors/domain-error.js";

export class CartId {
  private constructor(readonly value: string) {}

  static generate(): CartId {
    return new CartId(`crt_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): CartId {
    if (!value.match(/^crt_[a-zA-Z0-9]{32}$/)) {
      throw new ValidationError("cart ID", "must start with crt_");
    }

    return new CartId(value);
  }

  equals(other: CartId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
