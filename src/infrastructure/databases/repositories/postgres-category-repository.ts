import type { Category } from "#/domain/entities/category.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { CategoryId } from "#/domain/value-objects/category-id.js";
import { eq } from "drizzle-orm";
import {
  PostgresCategoryMapper,
  type CategoryRow,
} from "../mappers/postgres-category-mapper.js";
import { category } from "../schema.js";
import {
  type DrizzleDBClient,
  type DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { handleDrizzleErrors } from "../utils.js";
import { createLogger } from "#/shared/logging/logger.js";

export class PostgresCategoryRepository implements CategoryRepository {
  private logger = createLogger("PostgresCategoryRepository");

  constructor(private db: DrizzleDBClient) {}

  async find(id: CategoryId): Promise<Category | null> {
    this.logger.debug("find called", { id: id.value });

    try {
      // fetch category row from db
      const categoryRow: CategoryRow | undefined = await this.logger.measure(
        "db.query.category.findFirst",
        () =>
          this.db.query.category.findFirst({
            where: eq(category.id, id.value),
          }),
      );

      // if category row not found return null
      if (!categoryRow) {
        this.logger.debug("category not found", { id: id.value });

        return null;
      }

      // if category row found map it to domain
      const categoryToReturn = PostgresCategoryMapper.toDomain(categoryRow);

      this.logger.debug("find completed", {
        id: id.value,
        category: categoryToReturn.toSnapshot(),
      });

      // return category
      return categoryToReturn;
    } catch (error) {
      this.logger.error("find failed", error as Error, { id: id.value });

      handleDrizzleErrors(error, "PostgresCategoryRepository.find");
    }
  }

  async findMany(): Promise<Category[]> {
    this.logger.debug("findMany called");

    try {
      const categoriesRows: CategoryRow[] = await this.logger.measure(
        "db.query.category.findMany",
        () => this.db.query.category.findMany(),
      );

      const categoriesToReturn = categoriesRows.map(
        PostgresCategoryMapper.toDomain,
      );

      this.logger.debug("findMany completed", {
        categoriesCount: categoriesToReturn.length,
      });

      return categoriesToReturn;
    } catch (error) {
      this.logger.error("findMany failed", error as Error);

      handleDrizzleErrors(error, "PostgresCategoryRepository.findMany");
    }
  }

  async save(categoryEntity: Category, tx: TransactionClient): Promise<void> {
    this.logger.debug("save called", { id: categoryEntity.id.value });

    const db = tx as DrizzleTransactionClient;

    // named it categoryEntity because category is a reserved keyword
    const categoryRow: CategoryRow =
      PostgresCategoryMapper.toRow(categoryEntity);

    try {
      await this.logger.measure("db.insertOrUpdate", () =>
        db
          .insert(category)
          .values(categoryRow)
          .onConflictDoUpdate({
            target: [category.id],
            set: categoryRow,
          }),
      );

      this.logger.debug("save completed", { id: categoryEntity.id.value });
    } catch (error) {
      this.logger.error("save failed", error as Error, {
        id: categoryEntity.id.value,
      });

      handleDrizzleErrors(error, "PostgresCategoryRepository.save");
    }
  }

  async delete(id: CategoryId, tx: TransactionClient): Promise<void> {
    this.logger.debug("delete called", { id: id.value });

    const db = tx as DrizzleTransactionClient;

    try {
      await this.logger.measure("db.delete", () =>
        db.delete(category).where(eq(category.id, id.value)),
      );

      this.logger.debug("delete completed", { id: id.value });
    } catch (error) {
      this.logger.error("delete failed", error as Error, { id: id.value });

      handleDrizzleErrors(error, "PostgresCategoryRepository.delete");
    }
  }
}
