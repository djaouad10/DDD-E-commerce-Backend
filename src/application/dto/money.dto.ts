import type { Currency } from "#/domain/value-objects/money.js";

export type MoneySnapshot = {
  amount: number;
  currency: Currency;
};
