import { createLogger } from "#/shared/logging/logger.js";
import type { CategoryDTO } from "../dto/category.dto.js";
import type { CategoryQueries } from "../read-models/category.queries.js";

export default class GetCategoriesService {
  private logger = createLogger("GetCategoriesService");

  constructor(private categoryQueries: CategoryQueries) {}

  async execute(): Promise<CategoryDTO[]> {
    this.logger.info("GetCategoriesService.execute called");
    return await this.categoryQueries.getAll();
  }
}
