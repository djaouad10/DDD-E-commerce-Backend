import type { Color, Size } from "#/domain/entities/product.js";
import type { WeightDTO } from "./weight.dto.js";

export type VariationDTO = {
  id: string;
  size: Size;
  color: Color;
  totalQty: number;
  reservedQty: number;
  availableQty: number;
  isInStock: boolean;
  weightInGrams: WeightDTO;
  createdAt: string;
  updatedAt: string;
};
