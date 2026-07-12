import type { FileSnapshot } from "./file.snapshot.js";
import type { MoneySnapshot } from "./money.snapshot.js";
import type { VariationSnapshot } from "./variation.snapshot.js";

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
