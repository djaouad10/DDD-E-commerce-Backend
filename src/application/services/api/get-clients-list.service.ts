import { createLogger } from "#/shared/logging/logger.js";
import type { GetClientsListQuery } from "../../queries/get-clients-list.query.js";
import type { UserQueries } from "../../read-models/user.queries.js";

export class GetClientsListService {
  private logger = createLogger("GetClientsListService");

  constructor(private userQueries: UserQueries) {}

  async execute(query: GetClientsListQuery) {
    this.logger.info("GetClientsListService.execute called");

    const { limit, role, cursor } = query;

    return await this.userQueries.search({
      limit,
      role,
      ...(cursor && { cursor }),
    });
  }
}
