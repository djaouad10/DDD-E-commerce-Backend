import type { MoneyDTO } from "#/application/dto/money.dto.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

// add more currencies here in the future
export type Currency = "DZD";

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {}

  static of(amount: number): Money {
    if (amount < 0)
      throw new ValidationError("amount", "Money can not be negative");

    return new Money(amount, "DZD");
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount, "DZD");
  }

  subtract(other: Money): Money {
    if (this.amount < other.amount)
      throw new ValidationError("amount", "Money can not be negative");

    return new Money(this.amount - other.amount, "DZD");
  }

  multiply(qty: number): Money {
    return new Money(this.amount * qty, "DZD");
  }

  toDTO(): MoneyDTO {
    return { amount: this.amount, currency: this.currency };
  }
}
