import { ValidationError } from "#/shared/errors/domain-error.js";

export class ResetStuckOutboxRowsCommand {
  constructor(
    public readonly batchSize: number,
    public readonly stuckBefore: Date,
  ) {
    this.validate();
  }

  private validate() {
    if (this.batchSize <= 0) {
      throw new ValidationError("batchSize", "must be greater than 0");
    }

    if (this.stuckBefore > new Date()) {
      throw new ValidationError("stuckBefore", "must be in the past");
    }
  }
}
