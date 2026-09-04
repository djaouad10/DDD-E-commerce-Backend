import type { MoneySnapshot } from "#/domain/entities-snapshots/money.snapshot.js";
import type { CategoryDTO } from "./category.dto.js";
import type { ImageDTO } from "./file.dto.js";
import type { VariationSearchDTO } from "./variation.dto.js";

export type ProductSearchDTO = Omit<ProductStaticDataDTO, "images"> ;

export type ProductStaticDataDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string;
  material: string;
  price: MoneySnapshot;
  discountedPrice: MoneySnapshot | null;
  category: CategoryDTO | null;
  averageRating: number | null;
  mainImage: ImageDTO | null;
  images: ImageDTO[];
  createdAt: string;
  updatedAt: string;
};

export type VariationDTO = {
  id: string;
  size: string;
  color: string;
  totalQty: number;
  reservedQty: number;
  availableQty: number;
  isInStock: boolean;
  weightInGrams: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductLowStockDTO = {
  id: string;
  name: string;
  slug: string;
  category: CategoryDTO | null;
  mainImage: ImageDTO | null;
  lowStockVariations: VariationSearchDTO[];
};
