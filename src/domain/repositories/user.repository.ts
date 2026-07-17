import type { User } from "../entities/user.js";
import type { UserId } from "../value-objects/user-id.js";

export type UserRepository = {
  find: (id: UserId) => Promise<User | null>;
  findByEmail: (email: string) => Promise<User | null>;
  findMany: (ids: UserId[]) => Promise<User[]>;
  save: (user: User) => Promise<void>;
  delete: (id: UserId) => Promise<void>;
};
