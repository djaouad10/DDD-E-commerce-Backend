import type { Product } from "#/domain/entities/product.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type {
  DrizzleDBClient,
  DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { avg, eq, inArray } from "drizzle-orm";
import {
  PostgresProductMapper,
  type ProductWithVariationsAndFilesRow,
} from "../mappers/postgres-product-mapper.js";
import { file, product, rating, variation } from "../schema.js";
import type { Slug } from "#/domain/value-objects/slug.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { handleDrizzleErrors } from "../utils.js";
import { createLogger } from "#/shared/logging/logger.js";

export class PostgresProductRepository implements ProductRepository {
  private readonly logger = createLogger("PostgresProductRepository");

  constructor(private db: DrizzleDBClient) {}

  async find(id: ProductId): Promise<Product | null> {
    this.logger.debug("find called", { id: id.value });

    try {
      // get product row with variations and files
      const productWithVariationsAndFilesRow:
        | ProductWithVariationsAndFilesRow
        | undefined = await this.logger.measure(
        "db.query.product.findFirst",
        () =>
          this.db.query.product.findFirst({
            where: eq(product.id, id.value),
            with: { variations: true, images: true },
          }),
      );

      // if product not found return null
      if (!productWithVariationsAndFilesRow) {
        this.logger.debug("product not found", { id: id.value });
        return null;
      }

      // get average rating of product
      const [ratingResult] = await this.logger.measure(
        "db.select.from.rating",
        () =>
          this.db
            .select({
              productId: rating.product_id,
              averageRating: avg(rating.rating).mapWith(Number),
            })
            .from(rating)
            .where(eq(rating.product_id, id.value))
            .groupBy(rating.product_id),
      );

      // reconstitute product aggregate and return it
      const productToReturn = PostgresProductMapper.toDomain(
        productWithVariationsAndFilesRow,
        ratingResult?.averageRating ?? null,
      );

      this.logger.debug("find completed", {
        id: id.value,
        product: productToReturn.toSnapshot(),
      });

      return productToReturn;
    } catch (error) {
      this.logger.error("find failed", error as Error, { id: id.value });

      handleDrizzleErrors(error, "PostgresProductRepository.find");
    }
  }

  async findBySlug(slug: Slug): Promise<Product | null> {
    this.logger.debug("findBySlug called", { slug: slug.value });

    try {
      // get product with variations and files
      const productWithVariationsAndFilesRow:
        | ProductWithVariationsAndFilesRow
        | undefined = await this.logger.measure(
        "db.query.product.findFirst",
        () =>
          this.db.query.product.findFirst({
            where: eq(product.slug, slug.value),
            with: { variations: true, images: true },
          }),
      );

      // if product not found return null
      if (!productWithVariationsAndFilesRow) {
        this.logger.debug("product not found", { slug: slug.value });

        return null;
      }

      // get average rating of product
      const [ratingResult] = await this.logger.measure(
        "db.select.from.rating",
        () =>
          this.db
            .select({
              productId: rating.product_id,
              averageRating: avg(rating.rating).mapWith(Number),
            })
            .from(rating)
            .where(eq(rating.product_id, productWithVariationsAndFilesRow.id))
            .groupBy(rating.product_id),
      );

      // reconstitute product aggregate and return it
      const productToReturn = PostgresProductMapper.toDomain(
        productWithVariationsAndFilesRow,
        ratingResult?.averageRating ?? null,
      );

      this.logger.debug("findBySlug completed", {
        slug: slug.value,
        product: productToReturn.toSnapshot(),
      });

      return productToReturn;
    } catch (error) {
      this.logger.error("findBySlug failed", error as Error, {
        slug: slug.value,
      });

      handleDrizzleErrors(error, "PostgresProductRepository.findBySlug");
    }
  }

  async findMany(ids: ProductId[]): Promise<Product[]> {
    this.logger.debug("findMany called");

    if (ids.length === 0) {
      this.logger.debug("findMany completed");

      return [];
    }

    try {
      // get products with their variations and files
      const productWithVariationsAndFilesRow:
        | ProductWithVariationsAndFilesRow[]
        | undefined = await this.logger.measure(
        "db.query.product.findMany",
        () =>
          this.db.query.product.findMany({
            where: (product, { inArray }) =>
              inArray(
                product.id,
                ids.map((id) => id.value),
              ),
            with: { variations: true, images: true },
          }),
      );

      // get average rating of products
      const ratings = await this.logger.measure("db.select.from.rating", () =>
        this.db
          .select({
            productId: rating.product_id,
            avg: avg(rating.rating).mapWith(Number),
          })
          .from(rating)
          .where(
            inArray(
              rating.product_id,
              ids.map((id) => id.value),
            ),
          )
          .groupBy(rating.product_id),
      );

      // create a map of productId to average rating
      const ratingMap = new Map(ratings.map((r) => [r.productId, r.avg]));

      // reconstitute products aggregates and return them
      const productsToReturn = productWithVariationsAndFilesRow.map((row) =>
        PostgresProductMapper.toDomain(row, ratingMap.get(row.id) ?? null),
      );

      this.logger.debug("findMany completed", {
        productsCount: productsToReturn.length,
      });

      return productsToReturn;
    } catch (error) {
      this.logger.error("findMany failed", error as Error);

      handleDrizzleErrors(error, "PostgresProductRepository.findMany");
    }
  }

  async save(productAgg: Product, tx: TransactionClient): Promise<void> {
    this.logger.debug("save called", { id: productAgg.id.value });

    const db = tx as DrizzleTransactionClient;

    // the variations deletion will cascade to orderItems, which have an on delete restrict constraints on variationId column, so this opeation could fail
    // so should I check for this here, or should I check for this in application layer, so if the code ever reaches the product.save you know no orderItem is connected to a variation of this product

    // solution: only delete variations that are actually gone(u checked in application layer they have no orderItems) and upsert the rest!!!!

    const productRow = PostgresProductMapper.toRow(productAgg);
    const variationsRows = PostgresProductMapper.toVariationRows(productAgg);
    const filesRows = PostgresProductMapper.toFileRows(productAgg);

    // onConflictDoUpdate will update the createdAt timestamp, so we don't include it in the "set" clause
    const { created_at, ...productRowToUpsert } = productRow;
    try {
      // already in a transaction orchestrated by application service

      const [_, existingVariationIds] = await Promise.all([
        this.logger.measure("db.insert(product)", () =>
          db
            .insert(product)
            .values(productRow)
            .onConflictDoUpdate({
              target: [product.id],
              set: productRowToUpsert,
            }),
        ),

        this.logger.measure("db.query.variation.findMany", () =>
          // get current variationIds of this product in DB
          db.query.variation.findMany({
            where: eq(variation.product_id, productRow.id),
            columns: { id: true },
          }),
        ),
      ]);

      // diff them with the new variations derived from the aggregate
      const newVariationIds = new Set(variationsRows.map((v) => v.id));

      const toBeDeletedVariationIds = existingVariationIds
        .map((v) => v.id)
        .filter((v) => !newVariationIds.has(v));

      // collect all deletion promises in one list
      const deletions: Promise<unknown>[] = [
        // the query to delete all files of this product
        this.logger.measure("db.delete(file)", () =>
          db.delete(file).where(eq(file.product_id, productRow.id)),
        ),
      ];

      if (toBeDeletedVariationIds.length > 0) {
        // if there are variations to be deleted, add their deletion query to the deletion list
        deletions.push(
          this.logger.measure("db.delete(variation)", () =>
            db
              .delete(variation)
              .where(inArray(variation.id, toBeDeletedVariationIds)),
          ),
        );
      }

      // delete all files + to be deleted variations
      await Promise.all(deletions);

      // collect all upserts + inserts promises in one list
      const upserts: Promise<unknown>[] = variationsRows.map((v) => {
        // it initially contains the variation upserts queries

        // to avoid overwriting the createdAt timestamp by the onConflictDoUpdate
        const { created_at, ...variationToUpsert } = v;
        return this.logger.measure("db.insert(variation)", () =>
          db
            .insert(variation)
            .values(v)
            .onConflictDoUpdate({
              target: [variation.id],
              set: variationToUpsert,
            }),
        );
      });

      if (filesRows.length > 0) {
        // if there are files to be inserted add their insertion query to the upserts list
        upserts.push(
          this.logger.measure("db.insert(file)", () =>
            db.insert(file).values(filesRows),
          ),
        );
      }

      // upsert all variations + files
      await Promise.all(upserts);

      this.logger.debug("save completed", { id: productAgg.id.value });
    } catch (error) {
      this.logger.error("save failed", error as Error, {
        id: productAgg.id.value,
      });

      handleDrizzleErrors(error, "PostgresProductRepository.save");
    }
  }

  async delete(id: ProductId, tx?: TransactionClient): Promise<void> {
    this.logger.debug("delete called", { id: id.value });

    const db = tx as DrizzleTransactionClient;

    try {
      // this should be called after making sure there are no orderItems connected to this product in application layer
      // variations and files will be deleted automatically (on delete cascade)
      await this.logger.measure("db.delete(product)", () =>
        db.delete(product).where(eq(product.id, id.value)),
      );

      this.logger.debug("delete completed", { id: id.value });
    } catch (error) {
      this.logger.error("delete failed", error as Error, { id: id.value });

      handleDrizzleErrors(error, "PostgresProductRepository.delete");
    }
  }
}
