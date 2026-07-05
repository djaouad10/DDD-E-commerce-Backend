import type { DomainEvent } from "../events/domain-event.js";
import type { CategoryId } from "../value-objects/category-id.js";
import type { Money } from "../value-objects/money.js";
import { ProductId } from "../value-objects/product-id.js";
import type { Slug } from "../value-objects/slug.js";
import type { File } from "./file.js";
import type { Variation } from "./variation.js";

export const Size = {
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
  XXXL: "XXXL",
  EU_36: "EU_36",
  EU_37: "EU_37",
  EU_38: "EU_38",
  EU_39: "EU_39",
  EU_40: "EU_40",
  EU_41: "EU_41",
  EU_42: "EU_42",
  EU_4: "EU_43",
} as const;

export type Size = (typeof Size)[keyof typeof Size];

export const Color = {
  BLACK: "BLACK",
  WHITE: "WHITE",
  GRAY: "GRAY",
  RED: "RED",
  BLUE: "BLUE",
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  ORANGE: "ORANGE",
  PURPLE: "PURPLE",
  PINK: "PINK",
  BROWN: "BROWN",
  BEIGE: "BEIGE",
  NAVY: "NAVY",
  MAROON: "MAROON",
  TEAL: "TEAL",
} as const;

export type Color = (typeof Color)[keyof typeof Color];

export class Product {
  private _events: DomainEvent[] = [];
  private constructor(
    readonly id: ProductId,
    private _name: string,
    private slug: Slug,
    private _categoryId: CategoryId | null,
    private _images: File[],
    private _variations: Variation[],
    private _description: string | null,
    private _brand: string,
    private _material: string,
    private _price: Money,
    private _discountedPrice: Money | null,
    private _averageRating: number | null,
    private _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // factory
  static create(
    name: string,
    slug: Slug,
    categoryId: CategoryId | null,
    images: File[],
    variations: Variation[],
    description: string | null,
    brand: string,
    material: string,
    price: Money,
    discountedPrice: Money | null,
    averageRating: number | null,
  ): Product {
    // validation then

    const now = new Date();

    return new Product(
      ProductId.generate(),
      name,
      slug,
      categoryId,
      images,
      variations,
      description,
      brand,
      material,
      price,
      discountedPrice,
      averageRating,
      now,
      now,
    );
  }

  // reconstitute
static reconstitute(
  id: ProductId,
  name: string,
  slug: Slug,
  categoryId: CategoryId | null,
  images: File[],
  variations: Variation[],
  description: string | null,
  brand: string,
  material: string,
  price: Money,
  discountedPrice: Money | null,
  averageRating: number | null,
  createdAt: Date,
  updatedAt: Date,
): Product {
  // reconstitute from DB, reuse the same ID
  return new Product(
    id,
    name,
    slug,
    categoryId,
    images,
    variations,
    description,
    brand,
    material,
    price,
    discountedPrice,
    averageRating,
    createdAt,
    updatedAt,
  );
}

  // command methods

  // query methods

  // event methods

  // mappers

  // utils
}
