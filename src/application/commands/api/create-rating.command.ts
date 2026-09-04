import { ValidationError } from "#/shared/errors/domain-error.js";

export class CreateRatingCommand {
  constructor(
    public readonly productId: string,
    public readonly clientId: string,
    public readonly rating: number,
    public readonly comment: string | null,
  ) {
    this.validate();
  }

  private validate() {
    if (this.rating < 0 || this.rating > 5)
      throw new ValidationError("rating", "rating must be between 0 and 5");
  }
}
