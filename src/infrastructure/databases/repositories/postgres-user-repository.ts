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
import { handleDrizzleErrors } from "../utils.js";
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
    if (ids.length === 0) return [];

    try {
      const userRows: UserRow[] = await this.db.query.user.findMany({
        where: (user, { inArray }) =>
          inArray(
            user.id,
            ids.map((id) => id.value),
          ),
      });

      return userRows.map(PostgresUserMapper.toDomain);
    } catch (error) {
      handleDrizzleErrors(error, "PostgresUserRepository.findMany");
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const userRow: UserRow | undefined = await this.db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (!userRow) return null;

      return PostgresUserMapper.toDomain(userRow);
    } catch (error) {
      handleDrizzleErrors(error, "PostgresUserRepository.findByEmail");
    }
  }
}
