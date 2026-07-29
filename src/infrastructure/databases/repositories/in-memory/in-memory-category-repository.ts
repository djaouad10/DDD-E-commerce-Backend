import type { Category } from "#/domain/entities/category.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { CategoryId } from "#/domain/value-objects/category-id.js";

export class InMemoryCategoryRepository implements CategoryRepository {
  private categories: Category[] = [];

  async find(id: CategoryId): Promise<Category | null> {
    return this.categories.find((category) => category.id.equals(id)) ?? null;
  }

  async findMany(): Promise<Category[]> {
    return [...this.categories];
  }

  async save(category: Category): Promise<void> {
    const index = this.categories.findIndex((c) => c.id.equals(category.id));

    if (index >= 0) {
      this.categories[index] = category;
    } else {
      this.categories.push(category);
    }
  }

  async delete(id: CategoryId): Promise<void> {
    this.categories = this.categories.filter((c) => !c.id.equals(id));
  }
}
