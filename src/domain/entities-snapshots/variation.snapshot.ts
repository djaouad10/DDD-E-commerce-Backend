import type { Color, Size } from "#/domain/entities/product.js";
import type { WeightSnapshot } from "./weight.snapshot.js";

export type VariationSnapshot = {
  id: string;
  size: Size;
  color: Color;
  totalQty: number;
  reservedQty: number;
  availableQty: number;
  isInStock: boolean;
  weightInGrams: WeightSnapshot;
  createdAt: string;
  updatedAt: string;
};
