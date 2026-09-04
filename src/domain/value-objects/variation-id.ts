import { ValidationError } from "#/shared/errors/domain-error.js";

export class VariationId {
  private constructor(readonly value: string) {}

  static generate(): VariationId {
    return new VariationId(`var_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): VariationId {
    if (!value.match(/^var_[a-zA-Z0-9]{32}$/)) {
      throw new ValidationError("variation.id", "invalid id format");
    }

    return new VariationId(value);
  }

  equals(other: VariationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
