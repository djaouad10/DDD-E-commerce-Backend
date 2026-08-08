import { Category } from "#/domain/entities/category.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CreateCategoryCommand } from "../commands/create-category.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class CreateCategoryService {
  private logger = createLogger("CreateCategoryService");

  constructor(
    private db: DrizzleDBClient,
    private categoryRepository: CategoryRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<void> {
    this.logger.info(`Creating category ${command.name}`);

    const category = Category.create(command.name);

    const events = category.pullEvents();

    this.logger.debug("Saving category", { id: category.id.value });
    await this.db.transaction(async (tx) => {
      this.categoryRepository.save(category, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        this.outboxRepository.saveEvents(events, tx);
      }
    });
  }
}
