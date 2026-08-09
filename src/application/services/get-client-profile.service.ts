import type { UserSnapshot } from "#/domain/entities-snapshots/user.snapshot.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetClientProfileQuery } from "../queries/get-client-profile.query.js";

export class GetClientProfileService {
  private logger = createLogger("GetClientProfileService");

  constructor(private userRepository: UserRepository) {}

  async execute(query: GetClientProfileQuery): Promise<UserSnapshot> {
    this.logger.info("GetClientProfileService.execute called");
    const { clientId } = query;

    const user = await this.userRepository.find(UserId.of(clientId));

    if (!user) throw new NotFoundError("user", clientId);

    return user.toSnapshot();
  }
}
