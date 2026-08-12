import type { WeightSnapshot } from "#/domain/entities-snapshots/weight.snapshot.js";
import type { Color, Size } from "#/domain/entities/product.js";

export type VariationDTO = {
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

export type VariationWithCartItemDTO = VariationDTO & {
  cartItemId: string | null;
};

export type VariationSearchDTO = Omit<
  VariationDTO,
  "weightInGrams" | "createdAt" | "updatedAt"
>;
