import type { FileSnapshot } from "./file.dto.js";
import type { MoneySnapshot } from "./money.dto.js";
import type { VariationSnapshot } from "./variation.dto.js";

export type ProductSnapshot = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: FileSnapshot[];
  variations: VariationSnapshot[];
  brand: string;
  material: string;
  price: MoneySnapshot;
  discountedPrice: MoneySnapshot | null;
  category: string | null;
  averageRating: number | null;
  discountAmount: MoneySnapshot;
  discountPercentage: number;
  createdAt: string;
  updatedAt: string;
};
