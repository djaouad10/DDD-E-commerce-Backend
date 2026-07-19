import type { UserRole } from "#/domain/entities/user.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { UserDTO } from "../dto/user.dto.js";

export type UserSearchCriteria = {
  limit: number;
  role: UserRole;
  cursor?: UserId;
};

export type UserQueries = {
  search: (
    criteria: UserSearchCriteria,
  ) => Promise<{ users: UserDTO[]; nextCursor?: string }>;
};
