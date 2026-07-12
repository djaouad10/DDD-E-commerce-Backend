import type { Category } from "../entities/category.js";
import type { CategoryId } from "../value-objects/category-id.js";

export type CategoryRepository = {
  find(id: CategoryId): Promise<Category | null>;
  findMany: () => Promise<Category[]>;
  save(category: Category): Promise<void>;
  delete(id: CategoryId): Promise<void>;
};
