import type { UserRole } from "#/domain/entities/user.js";

type UserSearchCriteria = {
  limit: number;
  role: UserRole;
};

export type UserQueries = {
  search: (criteria: UserSearchCriteria) => Promise<UserDTO[]>;
};
