import type { CategoryDTO } from "#/application/dto/category.dto.js";
import type { CategoryQueries } from "#/application/read-models/category.queries.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
export class PostgresCategoryQueries implements CategoryQueries {
  private logger = createLogger("PostgresCategoryQueries");

  constructor(private db: DrizzleDBClient) {}

  async getAll(): Promise<CategoryDTO[]> {
    this.logger.debug("getAll called");
    try {
      const categories: CategoryDTO[] = await this.logger.measure(
        "db.query.category.findMany",
        () => this.db.query.category.findMany(),
      );

      this.logger.debug("getAll completed", {
        categoriesCount: categories.length,
      });

      return categories;
    } catch (error) {
      this.logger.error("getAll failed", error as Error);

      handleDrizzleErrors(error, "PostgresCategoryQueries.getAll");
    }
  }
}
