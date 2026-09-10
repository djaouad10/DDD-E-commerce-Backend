import { ValidationError } from "#/shared/errors/errors.js";

export class CleanOutboxCommand {
  constructor(public readonly olderThan: Date) {
    this.validate();
  }

  private validate() {
    if (this.olderThan > new Date()) {
      throw new ValidationError("olderThan", "must be in the past");
    }
  }
}
