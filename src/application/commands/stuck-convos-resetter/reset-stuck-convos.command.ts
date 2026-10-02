import { ValidationError } from "#/shared/errors/errors.js";

export class ResetStuckConvosCommand {
  constructor(
    public readonly batchSize: number,
    public readonly stuckforMs: number,
  ) {
    this.validate();
  }

  private validate() {
    if (this.batchSize <= 0) {
      throw new ValidationError("batchSize", "must be greater than 0");
    }

    if (this.stuckforMs <= 0) {
      throw new ValidationError("stuckforMs", "must be greater than 0");
    }
  }
}
