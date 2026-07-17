import { User } from "#/domain/entities/user.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleUserSelect } from "../schema.js";

export type UserRow = DrizzleUserSelect;

export class PostgresUserMapper {
  static toDomain(userRow: UserRow): User {
    return User.reconstitute(
      UserId.of(userRow.id),
      userRow.name,
      userRow.email,
      userRow.role,
      userRow.emailVerified,
      userRow.image,
      !!userRow.banned,
      userRow.createdAt,
      userRow.updatedAt,
      userRow.banReason ?? undefined,
      userRow.banExpires ?? undefined,
    );
  }

  static toRow(user: User): UserRow {
    return {
      id: user.id.value,
      name: user.getName(),
      email: user.email,
      role: user.role,
      emailVerified: user.getEmailVerified(),
      image: user.getImage(),
      banned: user.isBanned(),
      banReason: user.getBanReason(),
      banExpires: user.getBanExpires(),
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }
}
