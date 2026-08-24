import { Product } from "#/domain/entities/product.js";
import { CategoryId } from "#/domain/value-objects/category-id.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { Slug } from "#/domain/value-objects/slug.js";
import type {
  DrizzleFileSelect,
  DrizzleProductSelect,
  DrizzleVariationSelect,
} from "../../schema.js";

import { File } from "#/domain/entities/file.js";
import { FileId } from "#/domain/value-objects/file-id.js";
import { Variation } from "#/domain/entities/variation.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { Money } from "#/domain/value-objects/money.js";

export type PorductRow = DrizzleProductSelect;

export type VariationRow = DrizzleVariationSelect;

export type FileRow = DrizzleFileSelect;

export type ProductWithVariationsAndFilesRow = PorductRow & {
  variations: VariationRow[];
  images: FileRow[];
};

export class PostgresProductMapper {
  static toDomain(
    row: ProductWithVariationsAndFilesRow,
    averageRating: number | null,
  ): Product {
    const images: File[] = row.images.map((f) =>
      File.reconstitute(
        FileId.of(f.id),
        f.key,
        f.name,
        f.public_url,
        f.is_main,
      ),
    );

    const variations: Variation[] = row.variations.map((v) =>
      Variation.reconstitute(
        VariationId.of(v.id),
        v.size,
        v.color,
        v.total_qty,
        v.reserved_qty,
        Weight.of(v.weight_in_grams, "g"),
        v.created_at,
        v.updated_at,
      ),
    );

    return Product.reconstitute(
      ProductId.of(row.id),
      row.name,
      Slug.of(row.slug),
      row.categoryId ? CategoryId.of(row.categoryId) : null,
      images,
      variations,
      row.description,
      row.brand,
      row.material,
      Money.of(row.price, "DZD"),
      row.discount_price ? Money.of(row.discount_price, "DZD") : null,
      averageRating,
      row.created_at,
      row.updated_at,
      row.version,
    );
  }

  static toRow(product: Product): PorductRow {
    return {
      id: product.id.value,
      name: product.getName(),
      slug: product.getSlug().value,
      description: product.getDescription(),
      brand: product.getBrand(),
      categoryId: product.getCategoryId()?.value ?? null,
      material: product.getMaterial(),
      price: product.getPrice().amount,
      discount_price: product.getDiscountedPrice()?.amount ?? null,
      created_at: product.getCreatedAt(),
      updated_at: product.getUpdatedAt(),
      version: product.getVersion(),
    };
  }

  static toVariationRows(product: Product): VariationRow[] {
    return product.getVariations().map((v) => ({
      id: v.id.value,
      product_id: product.id.value,
      size: v.getSize(),
      color: v.getColor(),
      total_qty: v.getTotalQty(),
      reserved_qty: v.getReservedQty(),
      weight_in_grams: v.getWeight().weight,
      created_at: v.getCreatedAt(),
      updated_at: v.getUpdatedAt(),
    }));
  }

  static toFileRows(product: Product): FileRow[] {
    return product.getImages().map((f) => ({
      id: f.id.value,
      product_id: product.id.value,
      name: f.getName(),
      key: f.getKey(),
      public_url: f.publicUrl,
      is_main: f.isMain(),
    }));
  }
}
