import type { Category } from "../entities/category.js";

export type CategoryRepository = {
  find(id: string): Promise<Category | null>;
  save(category: Category): Promise<void>;
  delete(id: string): Promise<void>;
};
