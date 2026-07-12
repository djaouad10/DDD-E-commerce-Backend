import type { ProductStaticDataDTO } from "./product.dto.js";
import type { VariationDTO } from "./variation.dto.js";

export type CartItemDTO = {
  id: string;
  variation: VariationDTO;
  product: ProductStaticDataDTO;
  qty: number;
  updatedAt: string;
};

export type CartDTO = {
  id: string;
  userId: string;
  items: CartItemDTO[];
  updatedAt: string;
};
