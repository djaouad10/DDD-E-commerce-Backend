import type { User } from "#/domain/entities/user.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { DatabaseError } from "#/shared/errors/domain-error.js";
import { eq } from "drizzle-orm";
import {
  PostgresUserMapper,
  type UserRow,
} from "../mappers/postgres-user-mapper.js";
import { user } from "../schema.js";

export class PostgresUserRepository implements UserRepository {
  constructor(private db: DrizzleDBClient) {}
  async find(id: UserId): Promise<User | null> {
    try {
      const userRow: UserRow | undefined = await this.db.query.user.findFirst({
        where: eq(user.id, id.value),
      });

      if (!userRow) return null;

      return PostgresUserMapper.toDomain(userRow);
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresUserRepository.find",
        error,
      );
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
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresUserRepository.findMany",
        error,
      );
    }
  }
}
