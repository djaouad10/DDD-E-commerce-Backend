import type { CategorySnapshot } from "#/domain/entities-snapshots/category.snapshot.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { CategoryId } from "../value-objects/category-id.js";

export class Category {
  private _events: DomainEvent[] = [];

  //   constructor
  private constructor(
    readonly id: CategoryId,
    private _name: string,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  //   factories
  static create(name: string): Category {
    // validation
    if (name.length < 3) {
      throw new ValidationError(
        "name",
        "Category name must be at least 3 characters long",
      );
    }

    const now = new Date();
    return new Category(CategoryId.generate(), name, now, now);
  }

  static reconstitute(
    id: CategoryId,
    name: string,
    createdAt: Date,
    updatedAt: Date,
  ): Category {
    // validation
    if (name.length < 3) {
      throw new ValidationError(
        "name",
        "Category name must be at least 3 characters long",
      );
    }

    return new Category(id, name, createdAt, updatedAt);
  }

  // command methods
  updateName(name: string): void {
    // validation
    if (name.length < 3) {
      throw new ValidationError(
        "name",
        "Category name must be at least 3 characters long",
      );
    }

    this._name = name;
    this._updatedAt = new Date();
  }

  // query methods
  getName(): string {
    return this._name;
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
  toSnapshot(): CategorySnapshot {
    return {
      id: this.id.value,
      name: this._name,
    };
  }
}
