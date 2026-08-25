import type { UserRole } from "#/domain/entities/user.js";
import type { UserCursor } from "../read-models/user.queries.js";

export class GetClientsListQuery {
  constructor(
    public readonly limit: number,
    public readonly role: UserRole,
    public readonly cursor?: UserCursor,
  ) {}
}
