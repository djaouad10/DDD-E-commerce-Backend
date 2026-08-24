import type { Product } from "#/domain/entities/product.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { Slug } from "#/domain/value-objects/slug.js";
import type { VariationId } from "#/domain/value-objects/variation-id.js";

export class InMemoryProductRepository implements ProductRepository {
  private products: Product[] = [];

  async find(id: ProductId): Promise<Product | null> {
    return this.products.find((product) => product.id.equals(id)) ?? null;
  }
  async findBySlug(slug: Slug): Promise<Product | null> {
    return (
      this.products.find((product) => product.getSlug().value === slug.value) ??
      null
    );
  }

  async findByVariationIds(variationIds: VariationId[]): Promise<Product[]> {
    return this.products.filter((product) =>
      product.getVariations().some((v) => variationIds.includes(v.id)),
    );
  }

  async findMany(ids: ProductId[]): Promise<Product[]> {
    return this.products.filter((product) =>
      ids.some((id) => id.equals(product.id)),
    );
  }

  async save(product: Product): Promise<void> {
    const index = this.products.findIndex((p) => p.id.equals(product.id));

    if (index >= 0) {
      this.products[index] = product;
    } else {
      this.products.push(product);
    }
  }
  async delete(id: ProductId): Promise<void> {
    this.products = this.products.filter((p) => !p.id.equals(id));
  }
}
