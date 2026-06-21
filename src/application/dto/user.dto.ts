import type { UserRole } from "#/domain/entities/user.js";

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image: string;
  banned: boolean;
  createdAt: string;
};
