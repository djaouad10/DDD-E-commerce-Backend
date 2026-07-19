import type { UserDTO } from "#/application/dto/user.dto.js";
import type {
  UserQueries,
  UserSearchCriteria,
} from "#/application/read-models/user.queries.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleDrizzleErrors } from "../utils.js";

export class PostgresUserQueries implements UserQueries {
  private logger = createLogger("PostgresUserQueries");

  constructor(private db: DrizzleDBClient) {}
  async search(criteria: UserSearchCriteria): Promise<UserDTO[]> {
    this.logger.debug("search called", { criteria });

    try {
      const userRows = await this.logger.measure("db.query.user.findMany", () =>
        this.db.query.user.findMany({
          where: (user, { eq }) => eq(user.role, criteria.role),
          limit: criteria.limit,
          columns: {
            id: true,
            email: true,
            role: true,
            name: true,
            image: true,
            createdAt: true,
            banned: true,
          },
        }),
      );

      const usersToReturn = userRows.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        banned: !!user.banned,
        createdAt: user.createdAt.toISOString(),
      }));

      this.logger.debug("search completed", { usersCount: usersToReturn.length });

      return usersToReturn;
    } catch (error) {
      this.logger.error("search failed", error as Error, { criteria });

      handleDrizzleErrors(error, "PostgresUserQueries.search");
    }
  }
}
