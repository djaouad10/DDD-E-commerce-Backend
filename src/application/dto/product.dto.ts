import type { MoneySnapshot } from "#/domain/entities-snapshots/money.snapshot.js";
import type { CategoryDTO } from "./category.dto.js";
import type { ImageDTO } from "./file.dto.js";

export type ProductSearchDTO = ProductStaticDataDTO & {};

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
  mainImage: ImageDTO;
  createdAt: string;
  updatedAt: string;
};

export type ProductLowStockDTO = ProductStaticDataDTO & {};
