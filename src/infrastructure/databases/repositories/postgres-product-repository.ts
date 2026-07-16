import type { Product } from "#/domain/entities/product.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { DatabaseError } from "#/shared/errors/domain-error.js";
import { avg, eq } from "drizzle-orm";
import {
  PostgresProductMapper,
  type ProductWithVariationsAndFilesRow,
} from "../mappers/postgres-product-mapper.js";
import { product, rating } from "../schema.js";
import type { Slug } from "#/domain/value-objects/slug.js";

export class PostgresProductRepository implements ProductRepository {
  constructor(private db: DrizzleDBClient) {}

  async find(id: ProductId): Promise<Product | null> {
    try {
      // get product with variations and files
      const productWithVariationsAndFilesRow:
        | ProductWithVariationsAndFilesRow
        | undefined = await this.db.query.product.findFirst({
        where: eq(product.id, id.value),
        with: { variations: true, images: true },
      });

      // if product not found return null
      if (!productWithVariationsAndFilesRow) {
        return null;
      }

      // get average rating of product
      const [ratingResult] = await this.db
        .select({
          productId: rating.product_id,
          averageRating: avg(rating.rating).mapWith(Number),
        })
        .from(rating)
        .where(eq(rating.product_id, id.value))
        .groupBy(rating.product_id);

      // reconstitute product aggregate and return it
      return PostgresProductMapper.toDomain(
        productWithVariationsAndFilesRow,
        ratingResult?.averageRating ?? null,
      );
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresProductRepository.find",
        error,
      );
    }
  }

  async findBySlug(slug: Slug): Promise<Product | null> {
    try {
      // get product with variations and files
      const productWithVariationsAndFilesRow:
        | ProductWithVariationsAndFilesRow
        | undefined = await this.db.query.product.findFirst({
        where: eq(product.slug, slug.value),
        with: { variations: true, images: true },
      });

      // if product not found return null
      if (!productWithVariationsAndFilesRow) {
        return null;
      }

      // get average rating of product
      const [ratingResult] = await this.db
        .select({
          productId: rating.product_id,
          averageRating: avg(rating.rating).mapWith(Number),
        })
        .from(rating)
        .where(eq(rating.product_id, productWithVariationsAndFilesRow.id))
        .groupBy(rating.product_id);

      // reconstitute product aggregate and return it
      return PostgresProductMapper.toDomain(
        productWithVariationsAndFilesRow,
        ratingResult?.averageRating ?? null,
      );
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresProductRepository.findBySlug",
        error,
      );
    }
  }
}
