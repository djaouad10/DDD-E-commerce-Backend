import type { User } from "#/domain/entities/user.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import type { UserId } from "#/domain/value-objects/user-id.js";

export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];

  async find(id: UserId): Promise<User | null> {
    return this.users.find((user) => user.id.equals(id)) ?? null;
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }
  async findMany(ids: UserId[]): Promise<User[]> {
    return this.users.filter((user) => ids.some((id) => id.equals(user.id)));
  }
  async save(user: User): Promise<void> {
    this.users.push(user);
  }
}
