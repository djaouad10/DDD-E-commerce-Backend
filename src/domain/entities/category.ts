import type { CategoryDTO } from "#/application/dto/category.dto.js";
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
    const now = new Date();
    return new Category(CategoryId.generate(), name, now, now);
  }

  static reconstitute(
    id: CategoryId,
    name: string,
    createdAt: Date,
    updatedAt: Date,
  ): Category {
    return new Category(id, name, createdAt, updatedAt);
  }

  // command methods
  updateName(name: string): void {
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
  toDTO(): CategoryDTO {
    return {
      id: this.id.value,
      name: this._name,
    };
  }
}
