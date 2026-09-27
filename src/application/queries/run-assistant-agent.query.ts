import { ValidationError } from "#/shared/errors/errors.js";

export class RunAssistantAgentQuery {
  constructor(public readonly prompt: string) {
    this.validate();
  }

  private validate() {
    if (!this.prompt) {
      throw new ValidationError("prompt", "Prompt is required");
    }
  }
}
