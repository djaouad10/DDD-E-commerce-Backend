import type { CategoryDTO } from "../dto/category.dto.js";

export type CategoryQueries = {
  getAll: () => Promise<CategoryDTO[]>;
};
