import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetClientProfileQuery } from "../../queries/get-client-profile.query.js";

export class GetClientBanStatusService {
  private logger = createLogger("GetClientBanStatusService");

  constructor(private userRepository: UserRepository) {}

  async execute(query: GetClientProfileQuery): Promise<{ banned: boolean }> {
    this.logger.info("GetClientBanStatusService.execute called");
    const { clientId } = query;

    const user = await this.userRepository.find(UserId.of(clientId));

    if (!user) throw new NotFoundError("user", clientId);

    return { banned: user.isBanned() };
  }
}
