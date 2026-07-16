import type { Category } from "#/domain/entities/category.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { CategoryId } from "#/domain/value-objects/category-id.js";
import { DatabaseError } from "#/shared/errors/domain-error.js";
import { eq } from "drizzle-orm";
import {
  PostgresCategoryMapper,
  type CategoryRow,
} from "../mappers/postgres-category-mapper.js";
import { category } from "../schema.js";
import { db } from "#/infrastructure/config/database.js";

export class PostgresCategoryRepository implements CategoryRepository {
  async find(id: CategoryId): Promise<Category | null> {
    try {
      const categoryRow: CategoryRow | undefined =
        await db.query.category.findFirst({
          where: eq(category.id, id.value),
        });

      if (!categoryRow) {
        return null;
      }

      return PostgresCategoryMapper.toDomain(categoryRow);
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresCategoryRepository.find",
        error,
      );
    }
  }

  async findMany(): Promise<Category[]> {
    try {
      const categoriesRows: CategoryRow[] = await db.query.category.findMany();
      return categoriesRows.map(PostgresCategoryMapper.toDomain);
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresCategoryRepository.findMany",
        error,
      );
    }
  }
}
