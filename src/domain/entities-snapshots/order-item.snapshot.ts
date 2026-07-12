import type { MoneySnapshot } from "./money.snapshot.js";
import type { WeightSnapshot } from "./weight.snapshot.js";

export type OrderItemSnapshot = {
  id: string;
  variationId: string;
  qty: number;
  unitPriceAtOrderTime: MoneySnapshot;
  unitDiscountPriceAtOrderTime: MoneySnapshot | null;
  weightAtOrderTime: WeightSnapshot;
  lineTotal: MoneySnapshot;
  discountAmount: MoneySnapshot | null;
  totalWeightInGrams: WeightSnapshot;
  hasDiscount: boolean;
};
