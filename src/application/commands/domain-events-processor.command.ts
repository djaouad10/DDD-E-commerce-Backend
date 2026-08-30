import { ValidationError } from "#/shared/errors/domain-error.js";

export class DomainEventsProcessorCommand {
  constructor(
    public readonly maxPublicationAttempts: number = 3,
    public readonly batchSize: number,
  ) {
    this.validate();
  }

  private validate() {
    if (this.maxPublicationAttempts <= 0) {
      throw new ValidationError(
        "maxPublicationAttempts",
        "must be greater than 0",
      );
    }

    if (this.batchSize <= 0) {
      throw new ValidationError("batchSize", "must be greater than 0");
    }
  }
}
