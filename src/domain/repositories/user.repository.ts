import type { User } from "../entities/user.js";

export type UserRepository = {
  find: (id: string) => Promise<User | null>;
  save: (user: User) => Promise<void>;
  delete: (id: string) => Promise<void>;
};
