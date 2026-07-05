import type { RatingDTO } from "#/application/dto/rating.dto.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import type { ProductId } from "../value-objects/product-id.js";
import type { UserId } from "../value-objects/user-id.js";

export class Rating {
  private _events: DomainEvent[] = [];

  private constructor(
    readonly userId: UserId,
    readonly productId: ProductId,
    private _rating: number,
    private _comment: string | null,
    private _isApproved: boolean,
    private _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // factory
  static create(
    userId: UserId,
    productId: ProductId,
    rating: number,
    comment: string | null,
  ) {
    if (rating < 1 || rating > 5)
      throw new ValidationError("rating", "rating must be between 1 and 5");

    const now = new Date();
    return new Rating(userId, productId, rating, comment, false, now, now);
  }

  // reconstitute
  static reconstitute(
    userId: UserId,
    productId: ProductId,
    rating: number,
    comment: string | null,
    isApproved: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    if (rating < 1 || rating > 5)
      throw new ValidationError("rating", "rating must be between 1 and 5");

    return new Rating(
      userId,
      productId,
      rating,
      comment,
      isApproved,
      createdAt,
      updatedAt,
    );
  }

  // command methods
  approve(): void {
    this._isApproved = true;
    this._updatedAt = new Date();
  }

  reject(): void {
    this._isApproved = false;
    this._updatedAt = new Date();
  }

  // query methods
  isApproved(): boolean {
    return this._isApproved;
  }

  getRating(): number {
    return this._rating;
  }

  getComment(): string | null {
    return this._comment;
  }

  getCreatedAt(): Date {
    return this._createdAt;
  }

  getUpdatedAt(): Date {
    return this._updatedAt;
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

  // mappers
  toDTO(): RatingDTO {
    return {
      userId: this.userId.value,
      productId: this.productId.value,
      rating: this._rating,
      comment: this._comment,
      isApproved: this._isApproved,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
