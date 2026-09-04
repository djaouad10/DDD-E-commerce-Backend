import type { CategorySnapshot } from "#/domain/entities-snapshots/category.snapshot.js";
import { Category } from "#/domain/entities/category.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";
import type { CreateCategoryCommand } from "../../commands/api/create-category.command.js";
import type { OutboxRepository } from "../../ports/persistence/outbox.repository.port.js";

export class CreateCategoryService {
  private logger = createLogger("CreateCategoryService");

  constructor(
    private db: DBClient,
    private categoryRepository: CategoryRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<CategorySnapshot> {
    this.logger.info(`Creating category ${command.name}`);

    const category = Category.create(command.name);

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
