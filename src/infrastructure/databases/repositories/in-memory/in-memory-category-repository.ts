import type { Category } from "#/domain/entities/category.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { CategoryId } from "#/domain/value-objects/category-id.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";

export class InMemoryCategoryRepository implements CategoryRepository {
  private categories: Category[] = [];

  async find(id: CategoryId): Promise<Category | null> {
    return this.categories.find((category) => category.id.equals(id)) ?? null;
  }

  async findMany(): Promise<Category[]> {
    return [...this.categories];
  }

  async save(category: Category, tx?: TransactionClient): Promise<void> {
    const index = this.categories.findIndex((c) => c.id.equals(category.id));

    if (index >= 0) {
      this.categories[index] = category;
    } else {
      this.categories.push(category);
    }
  }

  async delete(id: CategoryId, tx?: TransactionClient): Promise<void> {
    this.categories = this.categories.filter((c) => !c.id.equals(id));
  }
}
