import { UserId } from "#/domain/value-objects/user-id.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CartDTO } from "../dto/cart.dto.js";
import type { GetUserCartQuery } from "../queries/get-user-cart.query.js";
import type { CartQueries } from "../read-models/cart.queries.js";

export class GetUserCartService {
  private logger = createLogger("GetUserCartService");

  constructor(private cartQueries: CartQueries) {}

  async execute(query: GetUserCartQuery): Promise<CartDTO> {
    this.logger.debug("GetUserCartService.execute called", { query });

    const userId = UserId.of(query.userId);

    return await this.cartQueries.getCartByUserId(userId);
  }
}
