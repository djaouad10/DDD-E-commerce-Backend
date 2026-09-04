import { BadRequestError } from "#/shared/errors/domain-error.js";

export class UpdateClientProfileCommand {
  constructor(
    public readonly clientId: string,
    public readonly name?: string,
    public readonly image?: string | null,
  ) {
    this.validate();
  }

  validate() {
    if (this.image === undefined && this.name === undefined) {
      throw new BadRequestError("provide at least one field to update");
    }
  }
}
