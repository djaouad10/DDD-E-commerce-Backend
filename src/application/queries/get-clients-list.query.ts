import type { UserRole } from "#/domain/entities/user.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { UserCursor } from "../read-models/user.queries.js";

export class GetClientsListQuery {
  constructor(
    public readonly limit: number,
    public readonly role: UserRole,
    public readonly cursor?: UserCursor,
  ) {
    this.validate();
  }

  private validate() {
    if (this.limit <= 0) {
      throw new ValidationError("limit", "limit must be greater than 0");
    }
  }
}
