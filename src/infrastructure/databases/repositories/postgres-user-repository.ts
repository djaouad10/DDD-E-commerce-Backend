import type { User } from "#/domain/entities/user.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { eq } from "drizzle-orm";
import {
  PostgresUserMapper,
  type UserRow,
} from "../mappers/postgres-user-mapper.js";
import { user } from "../schema.js";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
import { createLogger } from "#/shared/logging/logger.js";

export class PostgresUserRepository implements UserRepository {
  private logger = createLogger("PostgresUserRepository");

  constructor(private db: DrizzleDBClient) {}
  async find(id: UserId): Promise<User | null> {
    this.logger.debug("find called", { id: id.value });

    try {
      const userRow: UserRow | undefined = await this.logger.measure(
        "db.query.user.findFirst",
        () =>
          this.db.query.user.findFirst({
            where: eq(user.id, id.value),
          }),
      );

      if (!userRow) {
        this.logger.debug("user not found", { id: id.value });

        return null;
      }

      const userToReturn = PostgresUserMapper.toDomain(userRow);

      this.logger.debug("find completed", {
        id: id.value,
        user: userToReturn.toSnapshot(),
      });

      return userToReturn;
    } catch (error) {
      this.logger.error("find failed", error as Error, { id: id.value });

      handleDrizzleErrors(error, "PostgresUserRepository.find");
    }
  }

  async findMany(ids: UserId[]): Promise<User[]> {
    this.logger.debug("findMany called");

    if (ids.length === 0) {
      this.logger.debug("findMany completed");

      return [];
    }

    try {
      const userRows: UserRow[] = await this.logger.measure(
        "db.query.user.findMany",
        () =>
          this.db.query.user.findMany({
            where: (user, { inArray }) =>
              inArray(
                user.id,
                ids.map((id) => id.value),
              ),
          }),
      );

      const usersToReturn = userRows.map(PostgresUserMapper.toDomain);

      this.logger.debug("findMany completed", {
        usersCount: usersToReturn.length,
      });

      return usersToReturn;
    } catch (error) {
      this.logger.error("findMany failed", error as Error);

      handleDrizzleErrors(error, "PostgresUserRepository.findMany");
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug("findByEmail called", { email: email });

    try {
      const userRow: UserRow | undefined = await this.logger.measure(
        "db.query.user.findFirst",
        () =>
          this.db.query.user.findFirst({
            where: eq(user.email, email),
          }),
      );

      if (!userRow) {
        this.logger.debug("user not found", { email: email });

        return null;
      }

      const userToReturn = PostgresUserMapper.toDomain(userRow);

      this.logger.debug("findByEmail completed", {
        email: email,
        user: userToReturn.toSnapshot(),
      });

      return userToReturn;
    } catch (error) {
      this.logger.error("findByEmail failed", error as Error, { email: email });

      handleDrizzleErrors(error, "PostgresUserRepository.findByEmail");
    }
  }
}
