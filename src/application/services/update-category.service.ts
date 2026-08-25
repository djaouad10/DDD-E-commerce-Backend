import type { CategorySnapshot } from "#/domain/entities-snapshots/category.snapshot.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import { CategoryId } from "#/domain/value-objects/category-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateCategoryCommand } from "../commands/update-category.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class UpdateCategoryService {
  private logger = createLogger("UpdateCategoryService");
  constructor(
    private db: DrizzleDBClient,
    private categoryRepository: CategoryRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<CategorySnapshot> {
    this.logger.info(
      `Updating category ${command.categoryId} to ${command.name}`,
    );

    const categoryId = CategoryId.of(command.categoryId);

    const category = await this.categoryRepository.find(categoryId);

    if (!category) throw new NotFoundError("category", command.categoryId);

    category.updateName(command.name);

    const events = category.pullEvents();

    this.logger.debug("Saving category", { id: category.id.value });
    await this.db.transaction(async (tx) => {
      await this.categoryRepository.save(category, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        await this.outboxRepository.saveEvents(events, tx);
      }
    });

    return category.toSnapshot();
  }
}
