import { ValidationError } from "#/shared/errors/domain-error.js";

export class UserId {
  private constructor(readonly value: string) {}

  static generate(): UserId {
    return new UserId(`usr_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): UserId {
    if (!value.startsWith("usr_")) {
      throw new ValidationError("user ID", "must start with usr_");
    }

    return new UserId(value);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
