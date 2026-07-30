import { ValidationError } from "#/shared/errors/domain-error.js";

export class OutboxProcessorCommand {
  constructor(readonly maxPublicationAttempts: number = 3) {
    this.validate();
  }

  private validate() {
    if (this.maxPublicationAttempts <= 0) {
      throw new ValidationError(
        "maxPublicationAttempts",
        "must be greater than 0",
      );
    }
  }
}
