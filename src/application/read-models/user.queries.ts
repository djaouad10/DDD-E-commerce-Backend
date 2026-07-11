import type { UserRole } from "#/domain/entities/user.js";
import type { UserDTO } from "../dto/user.dto.js";

type UserSearchCriteria = {
  limit: number;
  role: UserRole;
};

export type UserQueries = {
  search: (criteria: UserSearchCriteria) => Promise<UserDTO[]>;
};
