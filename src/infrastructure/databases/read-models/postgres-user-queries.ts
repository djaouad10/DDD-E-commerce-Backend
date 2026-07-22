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
  async search(
    criteria: UserSearchCriteria,
  ): Promise<{ users: UserDTO[]; nextCursor?: string | undefined }> {
    this.logger.debug("search called", { criteria });

    try {
      // add cursor pagination and return next cursor
      const userRows = await this.logger.measure("db.query.user.findMany", () =>
        this.db.query.user.findMany({
          where: (user, { eq, gt, and }) => {
            const conditions = [eq(user.role, criteria.role)];

            if (criteria.cursor) {
              conditions.push(gt(user.id, criteria.cursor.value));
            }

            return and(...conditions);
          },
          orderBy: (user, { asc }) => [asc(user.id)],
          limit: criteria.limit + 1,
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

      const hasNextPage = userRows.length > criteria.limit;

      const rowsToReturn = hasNextPage
        ? userRows.slice(0, criteria.limit)
        : userRows;

      const usersToReturn = rowsToReturn.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        banned: !!user.banned,
        createdAt: user.createdAt.toISOString(),
      }));

      const nextCursor = hasNextPage
        ? rowsToReturn[rowsToReturn.length - 1]!.id
        : undefined;

      this.logger.debug("search completed", {
        usersCount: usersToReturn.length,
      });

      return { users: usersToReturn, nextCursor };
    } catch (error) {
      this.logger.error("search failed", error as Error, { criteria });

      handleDrizzleErrors(error, "PostgresUserQueries.search");
    }
  }
}
