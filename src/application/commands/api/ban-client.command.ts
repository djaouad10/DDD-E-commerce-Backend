import { ValidationError } from "#/shared/errors/domain-error.js";

export class BanClientCommand {
  constructor(
    public readonly clientId: string,
    public readonly banExpiresInSeconds?: number,
    public readonly reason?: string,
  ) {
    this.validate();
  }

  private validate() {
    if (this.banExpiresInSeconds && this.banExpiresInSeconds <= 0) {
      throw new ValidationError(
        "banExpiresInSeconds",
        "must be greater than 0",
      );
    }
  }
}
