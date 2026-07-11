import type { CategoryDTO } from "../../domain/entities-snapshots/category.dto.js";

export type CategoryQueries = {
  getAll: () => Promise<CategoryDTO[]>;
};
