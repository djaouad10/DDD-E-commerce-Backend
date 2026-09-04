import type { CartItemSnapshot } from "#/domain/entities-snapshots/cart-item.snapshot.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { AddItemToCartCommand } from "../../commands/api/add-item-to-cart.command.js";
import type { OutboxRepository } from "../../repositories/outbox.repository.js";

export class AddItemToCartService {
  private logger = createLogger("AddItemToCartService");

  constructor(
    private db: DrizzleDBClient,
    private cartRepository: CartRepository,
    private userRepository: UserRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: AddItemToCartCommand): Promise<CartItemSnapshot> {
    const { userId, variationId, qty } = command;
    this.logger.info("Adding item to cart", { userId, variationId, qty });

    const [user, cart] = await Promise.all([
      this.userRepository.find(UserId.of(userId)),
      this.cartRepository.findByUserId(UserId.of(userId)), // cartRepository will return an empty cart object even if user didn't exist, so it's safe to check that the user exists
    ]);

    if (!user) throw new NotFoundError("user", userId);

    const newItem = CartItem.create(VariationId.of(variationId), qty);

    cart.addItem(newItem);

    const events = cart.pullEvents();

    this.logger.debug("Saving cart", { id: cart.id.value });
    await this.db.transaction(async (tx) => {
      await this.cartRepository.save(cart, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        await this.outboxRepository.saveEvents(events, tx);
      }
    });

    return newItem.toSnapshot();
  }
}
