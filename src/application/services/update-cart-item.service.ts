import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateCartItemCommand } from "../commands/update-cart-item.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class UpdateCartItemService {
  private logger = createLogger("UpdateCartItemService");

  constructor(
    private db: DrizzleDBClient,
    private cartRepository: CartRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: UpdateCartItemCommand): Promise<void> {
    const { userId, itemId, newQty } = command;
    this.logger.info("Updating cart item", { userId, itemId, newQty });

    const cart = await this.cartRepository.findByUserId(UserId.of(userId));

    const item = cart.getItems().find((item) => item.id.value === itemId);

    if (!item) {
      this.logger.error("Item not found in cart", {} as Error, {
        userId,
        itemId,
      });

      throw new NotFoundError("cart.item", itemId);
    }

    item.updateQty(newQty);

    const events = cart.pullEvents();

    this.logger.debug("Saving cart", { id: cart.id.value });
    await this.db.transaction(async (tx) => {
      await this.cartRepository.save(cart, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        await this.outboxRepository.saveEvents(events, tx);
      }
    });
  }
}
