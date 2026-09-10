import type { UserRole } from "#/domain/entities/user.js";

export type AuthSession = {
  user: {
    role: UserRole;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
  };
  // could be extended to other fields in the future
};

export interface AuthPort {
  getSession(headers: Record<string, string>): Promise<AuthSession | null>;
}
