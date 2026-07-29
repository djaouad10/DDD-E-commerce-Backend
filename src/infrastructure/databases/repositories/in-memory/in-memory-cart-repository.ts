import { Cart } from "#/domain/entities/cart.js";
import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import type { UserId } from "#/domain/value-objects/user-id.js";

export class InMemoryCartRepository implements CartRepository {
  private carts: Cart[] = [];

  async findByUserId(userId: UserId): Promise<Cart> {
    const existingCart = this.carts.find(
      (cart) => cart.userId.value === userId.value,
    );

    if (existingCart) return existingCart;

    const cart = Cart.create(userId, []);

    this.carts.push(cart);

    return cart;
  }

  async save(cart: Cart): Promise<void> {
    const index = this.carts.findIndex((c) => c.userId.equals(cart.userId));

    if (index >= 0) {
      this.carts[index] = cart;
    } else {
      this.carts.push(cart);
    }
  }

  async delete(userId: UserId): Promise<void> {
    this.carts = this.carts.filter((c) => !c.userId.equals(userId));
  }
}
