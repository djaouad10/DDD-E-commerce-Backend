import { ValidationError } from "#/shared/errors/domain-error.js";

export class CategoryId {
  private constructor(readonly value: string) {}

  static generate(): CategoryId {
    return new CategoryId(`cat_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): CategoryId {
    if (!value.match(/^cat_[a-zA-Z0-9]{32}$/)) {
      throw new ValidationError("category ID", "must start with cat_");
    }

    return new CategoryId(value);
  }

  equals(other: CategoryId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
