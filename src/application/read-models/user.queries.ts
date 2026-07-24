import type { UserRole } from "#/domain/entities/user.js";
import type { UserDTO } from "../dto/user.dto.js";


export type UserCursor = {
  userId: string;
  createdAt: Date;
}
export type UserSearchCriteria = {
  limit: number;
  role: UserRole;
  cursor?: UserCursor;
};

export type UserQueries = {
  search: (
    criteria: UserSearchCriteria,
  ) => Promise<{ users: UserDTO[]; nextCursor?: UserCursor | undefined }>;
};
