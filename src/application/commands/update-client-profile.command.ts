import { BadRequestError } from "#/shared/errors/domain-error.js";

export class UpdateClientProfileCommand {
  constructor(
    public readonly clientId: string,
    public readonly name?: string,
    public readonly image?: string,
  ) {
    this.validate();
  }

  validate() {
    if (!this.image && !this.name) {
      throw new BadRequestError("provide at least one field to update");
    }
  }
}
