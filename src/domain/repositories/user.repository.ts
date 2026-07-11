import type { User } from "../entities/user.js";
import type { UserId } from "../value-objects/user-id.js";

export type UserRepository = {
  find: (id: UserId) => Promise<User | null>;
  save: (user: User) => Promise<void>;
  delete: (id: UserId) => Promise<void>;
};
