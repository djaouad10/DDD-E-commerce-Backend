import type { FileDTO } from "./file.dto.js";
import type { MoneyDTO } from "./money.dto.js";
import type { VariationDTO } from "./variation.dto.js";

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: FileDTO[];
  variations: VariationDTO[];
  brand: string;
  material: string;
  price: MoneyDTO;
  discountedPrice: MoneyDTO | null;
  category: string | null;
  averageRating: number | null;
  createdAt: string;
  updatedAt: string;
}
