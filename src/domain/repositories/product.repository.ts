import type { Product } from "../entities/product.js";

export type ProductRepository = {
  find(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
};
