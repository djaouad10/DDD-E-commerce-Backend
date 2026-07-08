import type { ProductDTO } from "#/application/dto/product.dto.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { FileUploaded } from "../events/file/file-uploaded.js";
import { ProductCreated } from "../events/product/product-created.js";
import { ProductImageAdded } from "../events/product/product-image-added.js";
import { ProductImageRemoved } from "../events/product/product-image-removed.js";
import { ProductMainImageUpdated } from "../events/product/product-main-image-updated.js";
import { ProductUpdated } from "../events/product/product-updated.js";
import { ProductVariationAdded } from "../events/product/product-variation-added.js";
import { ProductVariationRemoved } from "../events/product/product-variation-removed.js";
import { StockReleased } from "../events/product/stock-released.js";
import { StockReserved } from "../events/product/stock-reserved.js";
import { VariationCreated } from "../events/product/variation-created.js";
import { VariationStockUpdated } from "../events/product/variation-stock-updated.js";
import { VariationWeightUpdated } from "../events/product/variation-weight-updated.js";
import type { CategoryId } from "../value-objects/category-id.js";
import type { FileId } from "../value-objects/file-id.js";
import { Money } from "../value-objects/money.js";
import { ProductId } from "../value-objects/product-id.js";
import { Slug } from "../value-objects/slug.js";
import type { VariationId } from "../value-objects/variation-id.js";
import type { Weight } from "../value-objects/weight.js";
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
    private readonly _averageRating: number | null,
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
    // validation
    if (images.length === 0)
      throw new ValidationError(
        "images",
        "product must have at least one image",
      );

    if (!images.find((i) => i.isMain()))
      throw new ValidationError("images", "product must have a main image");

    if (variations.length === 0)
      throw new ValidationError(
        "variations",
        "product must have at least one variation",
      );

    const numberOfMainImages = images.filter((i) => i.isMain()).length;
    if (numberOfMainImages > 1)
      throw new ValidationError(
        "images",
        "product can have only one main image",
      );

    if (averageRating !== null && (averageRating < 0 || averageRating > 5))
      throw new ValidationError(
        "averageRating",
        "average rating must be between 0 and 5",
      );

    if (discountedPrice && discountedPrice.amount > price.amount)
      throw new ValidationError(
        "discountedPrice",
        "discounted price must be less than the price",
      );

    if (discountedPrice && discountedPrice.currency !== price.currency)
      throw new ValidationError(
        "discountedPrice",
        "discounted price must have the same currency as the price",
      );

    const now = new Date();

    const product = new Product(
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

    product.recordThat(
      new ProductCreated(
        product.id.value,
        name,
        slug.value,
        categoryId?.value ?? null,
        brand,
        price.amount,
        price.currency,
      ),
    );

    return product;
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
    // validation
    if (images.length === 0)
      throw new ValidationError(
        "images",
        "product must have at least one image",
      );

    if (!images.find((i) => i.isMain()))
      throw new ValidationError("images", "product must have a main image");

    if (variations.length === 0)
      throw new ValidationError(
        "variations",
        "product must have at least one variation",
      );

    const numberOfMainImages = images.filter((i) => i.isMain()).length;
    if (numberOfMainImages > 1)
      throw new ValidationError(
        "images",
        "product can have only one main image",
      );

    if (averageRating !== null && (averageRating < 0 || averageRating > 5))
      throw new ValidationError(
        "averageRating",
        "average rating must be between 0 and 5",
      );

    if (discountedPrice && discountedPrice.amount > price.amount)
      throw new ValidationError(
        "discountedPrice",
        "discounted price must be less than the price",
      );

    if (discountedPrice && discountedPrice.currency !== price.currency)
      throw new ValidationError(
        "discountedPrice",
        "discounted price must have the same currency as the price",
      );

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
  updateName(newName: string): void {
    // validation
    if (newName.length === 0)
      throw new ValidationError("name", "name is empty");

    this._name = newName;
    this.slug = Slug.generate(newName);
    this._updatedAt = new Date();

    this.recordThat(new ProductUpdated(this.id.value, ["name"]));
  }

  updateCategory(newCategoryId: CategoryId | null): void {
    this._categoryId = newCategoryId;
    this._updatedAt = new Date();

    this.recordThat(new ProductUpdated(this.id.value, ["category"]));
  }

  updateDescription(newDescription: string | null): void {
    this._description = newDescription;
    this._updatedAt = new Date();

    this.recordThat(new ProductUpdated(this.id.value, ["description"]));
  }

  updateBrand(newBrand: string): void {
    this._brand = newBrand;
    this._updatedAt = new Date();

    this.recordThat(new ProductUpdated(this.id.value, ["brand"]));
  }

  updateMaterial(newMaterial: string): void {
    this._material = newMaterial;
    this._updatedAt = new Date();

    this.recordThat(new ProductUpdated(this.id.value, ["material"]));
  }

  updatePrice(newPrice: Money): void {
    if (newPrice.currency !== this._price.currency)
      throw new ValidationError(
        "currency",
        "price must have the same currency as existing price",
      );

    if (
      this._discountedPrice &&
      newPrice.amount <= this._discountedPrice.amount
    )
      throw new ValidationError(
        "newPrice",
        "price must be greater than existing discounted price",
      );

    this._price = newPrice;
    this._updatedAt = new Date();

    this.recordThat(new ProductUpdated(this.id.value, ["price"]));
  }

  updateDiscountedPrice(newDiscountedPrice: Money | null): void {
    if (
      newDiscountedPrice &&
      newDiscountedPrice.currency !== this._price.currency
    )
      throw new ValidationError(
        "currency",
        "discounted price must have the same currency as existing price",
      );

    if (newDiscountedPrice && newDiscountedPrice.amount >= this._price.amount)
      throw new ValidationError(
        "newDiscountedPrice",
        "discounted price must be less than existing price",
      );

    this._discountedPrice = newDiscountedPrice;
    this._updatedAt = new Date();

    this.recordThat(new ProductUpdated(this.id.value, ["discountedPrice"]));
  }

  addVariation(newVariation: Variation): void {
    // make sure the color + size combo doesn't exist already
    const existingVariation = this._variations.find((v) => {
      return (
        v.getColor() === newVariation.getColor() &&
        v.getSize() === newVariation.getSize()
      );
    });

    if (existingVariation)
      throw new ValidationError(
        "newVariation",
        "variation with same color and size already exists",
      );

    this._variations.push(newVariation);
    this._updatedAt = new Date();

    // record domain events
    this.recordThat(
      new ProductVariationAdded(
        this.id.value,
        newVariation.id.value,
        newVariation.getSize(),
        newVariation.getColor(),
      ),
    );

    this.recordThat(
      new VariationCreated(
        this.id.value,
        newVariation.id.value,
        newVariation.getSize(),
        newVariation.getColor(),
        newVariation.getTotalQty(),
        newVariation.getWeight().weight,
      ),
    );
  }

  updateVariationTotalQty(variationId: VariationId, newTotalQty: number) {
    // find the variation to update
    const variationToUpdate = this._variations.find((v) =>
      v.id.equals(variationId),
    );

    if (!variationToUpdate)
      throw new ValidationError("variationId", "variation not found");

    const prevTotalQty = variationToUpdate.getTotalQty();

    // validation here, then update
    variationToUpdate.updateTotalQty(newTotalQty);

    // record domain events
    this.recordThat(
      new VariationStockUpdated(
        this.id.value,
        variationId.value,
        prevTotalQty,
        variationToUpdate.getTotalQty(),
        variationToUpdate.getAvailableQty(),
      ),
    );
  }

  updateVariationWeight(variationId: VariationId, newWeightInGrams: Weight) {
    // find the variation to update
    const variationToUpdate = this._variations.find((v) =>
      v.id.equals(variationId),
    );

    if (!variationToUpdate)
      throw new ValidationError("variationId", "variation not found");

    const prevWeightInGrams = variationToUpdate.getWeight();

    // validation here, then update
    variationToUpdate.updateWeight(newWeightInGrams);

    // record domain events
    this.recordThat(
      new VariationWeightUpdated(
        this.id.value,
        variationId.value,
        prevWeightInGrams.weight,
        variationToUpdate.getWeight().weight,
      ),
    );
  }

  removeVariation(variationId: VariationId): void {
    // find the variation to remove
    const variationToRemove = this._variations.find((v) =>
      v.id.equals(variationId),
    );

    if (!variationToRemove)
      throw new ValidationError("variationId", "variation not found");

    this._variations = this._variations.filter(
      (v) => !v.id.equals(variationId),
    );

    this._updatedAt = new Date();

    // record domain events
    this.recordThat(
      new ProductVariationRemoved(this.id.value, variationId.value),
    );
  }

  reserveStock(variationId: VariationId, qty: number) {
    // find the variation to reserve
    const variationToReserve = this._variations.find((v) =>
      v.id.equals(variationId),
    );

    if (!variationToReserve)
      throw new ValidationError("variationId", "variation not found");

    variationToReserve.reserve(qty);

    // record domain events
    this.recordThat(
      new StockReserved(
        this.id.value,
        variationId.value,
        qty,
        variationToReserve.getAvailableQty(),
        variationToReserve.getReservedQty(),
      ),
    );
  }

  releaseStock(variationId: VariationId, qty: number) {
    // find the variation to release
    const variationToRelease = this._variations.find((v) =>
      v.id.equals(variationId),
    );

    if (!variationToRelease)
      throw new ValidationError("variationId", "variation not found");

    variationToRelease.release(qty);

    // record domain events
    this.recordThat(
      new StockReleased(
        this.id.value,
        variationId.value,
        qty,
        variationToRelease.getAvailableQty(),
      ),
    );
  }

  addImage(newImage: File): void {
    // make sure there is only one main image
    newImage.setIsMain(false);

    this._images.push(newImage);
    this._updatedAt = new Date();

    // record domain events
    this.recordThat(
      new FileUploaded(
        this.id.value,
        newImage.id.value,
        newImage.getKey(),
        false,
      ),
    );

    this.recordThat(
      new ProductImageAdded(this.id.value, newImage.id.value, false),
    );
  }

  updateMainImage(newMainImage: File): void {
    // find the old main image
    const oldMainImage = this._images.find((i) => i.isMain());

    // set all exiting images to not main
    this._images.forEach((i) => i.setIsMain(false));

    // update the new image to be a main image
    newMainImage.setIsMain(true);

    // add the new main image to product images list
    this._images.push(newMainImage);

    // remove the old main image
    if (oldMainImage)
      this._images = this._images.filter((i) => !i.id.equals(oldMainImage.id));

    this._updatedAt = new Date();

    // record domain events
    this.recordThat(
      new ProductMainImageUpdated(
        this.id.value,
        newMainImage.id.value,
        oldMainImage?.id.value ?? null,
      ),
    );
  }

  removeImage(imageId: FileId): void {
    const targetImage = this._images.find((i) => i.id.equals(imageId));

    if (!targetImage) throw new ValidationError("imageId", "image not found");

    if (targetImage.isMain())
      throw new ValidationError("imageId", "cannot remove main image");

    this._images = this._images.filter((i) => !i.id.equals(imageId));
    this._updatedAt = new Date();

    // record domain events
    this.recordThat(new ProductImageRemoved(this.id.value, imageId.value));
  }

  // query methods
  getName(): string {
    return this._name;
  }

  getSlug(): Slug {
    return this.slug;
  }

  getDescription(): string | null {
    return this._description;
  }

  getImages(): File[] {
    return this._images;
  }

  getVariations(): Variation[] {
    return this._variations;
  }

  getBrand(): string {
    return this._brand;
  }

  getMaterial(): string {
    return this._material;
  }

  getPrice(): Money {
    return this._price;
  }

  getDiscountedPrice(): Money | null {
    return this._discountedPrice;
  }

  getCategoryId(): CategoryId | null {
    return this._categoryId;
  }

  isInStock(): boolean {
    return this._variations.some((v) => v.isInStock());
  }

  getAverageRating(): number | null {
    return this._averageRating;
  }

  getCreatedAt(): Date {
    return this._createdAt;
  }

  getUpdatedAt(): Date {
    return this._updatedAt;
  }

  getDisplayPrice(): Money {
    return this._discountedPrice ?? this._price;
  }

  hasDiscount(): boolean {
    return !!this._discountedPrice;
  }

  getDiscountAmount(): Money {
    if (!this.hasDiscount()) {
      return Money.of(0, this._price.currency);
    }

    return this._price.subtract(this._discountedPrice!);
  }

  // event methods
  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }

  peekEvents(): readonly DomainEvent[] {
    return [...this._events];
  }

  private recordThat(event: DomainEvent): void {
    this._events.push(event);
  }

  // mappers
  toDTO(): ProductDTO {
    return {
      id: this.id.toString(),
      name: this._name,
      slug: this.slug.value,
      description: this._description,
      images: this._images.map((i) => i.toDTO()),
      variations: this._variations.map((v) => v.toDTO()),
      brand: this._brand,
      material: this._material,
      price: this._price.toDTO(),
      discountedPrice: this._discountedPrice?.toDTO() ?? null,
      category: this._categoryId?.toString() ?? null,
      averageRating: this._averageRating,
      discountAmount: this.getDiscountAmount().toDTO(),
      discountPercentage: this.calculateDiscountPercentage(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  // utils
  calculateDiscountPercentage(): number {
    return Math.round(
      (this.getDiscountAmount().amount / this._price.amount) * 100,
    );
  }
}
