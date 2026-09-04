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
  ) {}

  //   factories
  static create(name: string): Category {
    // validation
    if (name.length < 3) {
      throw new ValidationError(
        "category.name",
        "Category name must be at least 3 characters long",
      );
    }

    return new Category(CategoryId.generate(), name);
  }

  static reconstitute(id: CategoryId, name: string): Category {
    // validation
    if (name.length < 3) {
      throw new ValidationError(
        "category.name",
        "Category name must be at least 3 characters long",
      );
    }

    return new Category(id, name);
  }

  // command methods
  updateName(name: string): void {
    // validation
    if (name.length < 3) {
      throw new ValidationError(
        "category.name",
        "Category name must be at least 3 characters long",
      );
    }

    this._name = name;
  }

  // query methods
  getName(): string {
    return this._name;
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
