import type { MoneyDTO } from "./money.dto.js";
import type { WeightDTO } from "./weight.dto.js";

export type OrderItemDTO = {
  id: string;
  variationId: string;
  qty: number;
  unitPriceAtOrderTime: MoneyDTO;
  unitDiscountPriceAtOrderTime: MoneyDTO | null;
  weightAtOrderTime: WeightDTO;
  lineTotal: MoneyDTO;
  discountAmount: MoneyDTO | null;
  totalWeightInGrams: WeightDTO;
  hasDiscount: boolean;
};
