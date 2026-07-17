import { CartItem } from "#/domain/entities/cart-item.js";
import { Cart } from "#/domain/entities/cart.js";
import { CartId } from "#/domain/value-objects/cart-id.js";
import { CartItemId } from "#/domain/value-objects/cart-item-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import type { DrizzleCartItemSelect } from "../schema.js";

export type CartItemRow = DrizzleCartItemSelect;

export class PostgresCartMapper {
  static toDomain(cartRows: CartItemRow[], userId: string): Cart {
    const cartItems: CartItem[] = cartRows.map((row) =>
      CartItem.reconstitute(
        CartItemId.of(row.id),
        VariationId.of(row.variation_id),
        row.selected_qty,
        row.updated_at,
      ),
    );

    return Cart.reconstitute(CartId.generate(), UserId.of(userId), cartItems);
  }
}
