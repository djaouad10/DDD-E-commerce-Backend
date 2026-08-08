import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CartDTO } from "../dto/cart.dto.js";
import type { GetUserCartQuery } from "../queries/get-user-cart.query.js";
import type { CartQueries } from "../read-models/cart.queries.js";

export class GetUserCartService {
  private logger = createLogger("GetUserCartService");

  constructor(
    private cartQueries: CartQueries,
    private userRepository: UserRepository,
  ) {}

  async execute(query: GetUserCartQuery): Promise<CartDTO> {
    this.logger.debug("GetUserCartService.execute called", { query });

    const userId = UserId.of(query.userId);

    const user = await this.userRepository.find(userId);
    if (user === null) throw new NotFoundError("user", userId.value);

    return await this.cartQueries.getCartByUserId(userId);
  }
}
