import type { Currency } from "#/domain/value-objects/money.js";

export type MoneyDTO = {
  amount: number;
  currency: Currency;
};
