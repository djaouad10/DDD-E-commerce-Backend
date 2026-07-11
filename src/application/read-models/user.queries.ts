import type { UserRole } from "#/domain/entities/user.js";
import type { UserDTO } from "../../domain/entities-snapshots/user.dto.js";

type UserSearchCriteria = {
  limit: number;
  role: UserRole;
};

export type UserQueries = {
  search: (criteria: UserSearchCriteria) => Promise<UserDTO[]>;
};
