import { ValidationError } from "#/shared/errors/errors.js";

export class RunAssistantAgentQuery {
  constructor(
    public readonly prompt: string,
    public readonly userId: string,
    public readonly conversationId?: string,
  ) {
    this.validate();
  }

  private validate() {
    if (!this.prompt) {
      throw new ValidationError("prompt", "Prompt is required");
    }

    if (!this.userId) {
      throw new ValidationError("userId", "userId is required");
    }
  }
}
