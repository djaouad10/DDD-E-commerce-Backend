import type { Product } from "../entities/product.js";
import type { ProductId } from "../value-objects/product-id.js";
import type { Slug } from "../value-objects/slug.js";

export type ProductRepository = {
  find(id: ProductId): Promise<Product | null>;
  findBySlug(slug: Slug): Promise<Product | null>;
  findMany(ids: ProductId[]): Promise<Product[]>;
  save(product: Product): Promise<void>;
  delete(id: ProductId): Promise<void>;
};
