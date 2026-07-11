import type { MoneyDTO } from "#/domain/entities-snapshots/money.dto.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

// add more currencies here in the future

export const Currency = {
  DZD: "DZD",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {}

  static of(amount: number, currency: Currency): Money {
    if (amount < 0)
      throw new ValidationError("amount", "Money can not be negative");

    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency)
      throw new ValidationError(
        "currency",
        "Money must have the same currency",
      );

    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency)
      throw new ValidationError(
        "currency",
        "Money must have the same currency",
      );

    if (this.amount < other.amount)
      throw new ValidationError("amount", "Money can not be negative");

    return new Money(this.amount - other.amount, "DZD");
  }

  multiply(qty: number): Money {
    if (qty < 0) throw new ValidationError("qty", "qty can not be negative");

    return new Money(this.amount * qty, this.currency);
  }

  toSnapshot(): MoneyDTO {
    return { amount: this.amount, currency: this.currency };
  }
}
