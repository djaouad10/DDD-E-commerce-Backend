import { Category } from "#/domain/entities/category.js";
import { CategoryId } from "#/domain/value-objects/category-id.js";
import type { DrizzleCategorySelect } from "../../schema.js";

export type CategoryRow = DrizzleCategorySelect;

export class PostgresCategoryMapper {
  static toDomain(categoryRow: CategoryRow): Category {
    return Category.reconstitute(
      CategoryId.of(categoryRow.id),
      categoryRow.name,
    );
  }

  static toRow(category: Category): CategoryRow {
    return {
      id: category.id.value,
      name: category.getName(),
    };
  }
}
