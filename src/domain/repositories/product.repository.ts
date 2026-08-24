import type { TransactionClient } from "#/shared/types/transaction-client.js";
import type { Product } from "../entities/product.js";
import type { ProductId } from "../value-objects/product-id.js";
import type { Slug } from "../value-objects/slug.js";
import type { VariationId } from "../value-objects/variation-id.js";

export type ProductRepository = {
  find(id: ProductId): Promise<Product | null>;
  findBySlug(slug: Slug): Promise<Product | null>;
  findByVariationIds(variationIds: VariationId[]): Promise<Product[]>;
  findMany(ids: ProductId[]): Promise<Product[]>;
  save(product: Product, tx?: TransactionClient): Promise<void>;
  delete(id: ProductId, tx?: TransactionClient): Promise<void>;
};
