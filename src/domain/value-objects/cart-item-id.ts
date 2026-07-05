import { ValidationError } from "#/shared/errors/domain-error.js";

export class CartItemId {
  private constructor(readonly value: string) {}

  static generate(): CartItemId {
    return new CartItemId(`crtitm_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): CartItemId {
    if (!value.match(/^crtitm_[a-zA-Z0-9]{32}$/)) {
      throw new ValidationError("cart item ID", "must start with crtitm_");
    }

    return new CartItemId(value);
  }

  equals(other: CartItemId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
