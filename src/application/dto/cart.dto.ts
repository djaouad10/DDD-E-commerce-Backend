import type { CategoryDTO } from "./category.dto.js";
import type { ImageDTO } from "./file.dto.js";
import type { VariationDTO } from "./variation.dto.js";

export type CartItemDTO = {
  id: string;
  variation: VariationDTO;
  product: {
    id: string;
    name: string;
    slug: string;
    category: CategoryDTO | null;
    mainImage: ImageDTO;
  };
  qty: number;
  updatedAt: string;
};

export type CartDTO = {
  userId: string;
  items: CartItemDTO[];
  updatedAt: string;
};
