import type { CategoryDTO } from "../dto/category.dto.js";

export type CategoryQueries = {
  // doesn't require an aggregate
  getAll: () => Promise<CategoryDTO[]>;
};
