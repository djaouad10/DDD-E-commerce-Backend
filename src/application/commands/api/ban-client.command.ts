import { ValidationError } from "#/shared/errors/domain-error.js";

export class BanClientCommand {
  constructor(
    public readonly clientId: string,
    public readonly banExpiresInSeconds?: number,
    public readonly reason?: string,
  ) {
    this.validate(banExpiresInSeconds);
  }

  private validate(banExpiresInSeconds: number | undefined) {
    if (banExpiresInSeconds && banExpiresInSeconds <= 0) {
      throw new ValidationError(
        "banExpiresInSeconds",
        "must be greater than 0",
      );
    }
  }
}
