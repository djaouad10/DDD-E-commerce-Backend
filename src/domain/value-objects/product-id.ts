import { ValidationError } from "#/shared/errors/domain-error.js";

export class ProductId {
  private constructor(readonly value: string) {}

  static generate(): ProductId {
    return new ProductId(`prod_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): ProductId {
    if (!value.match(/^prod_[a-zA-Z0-9]{32}$/)) {
      throw new ValidationError("product.id", "invalid id format");
    }

    return new ProductId(value);
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
