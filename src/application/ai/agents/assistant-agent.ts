import type {
  ChatMessage,
  ChatModelPort,
} from "#/application/ports/ai/chat-model.port.js";
import type { McpClientGateway } from "#/application/ports/clients/mcp-client.gateway.js";
import { MaxStepsExceededError } from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";

export type AssistantAgentConfig = {
  maxSteps: number;
};

export class AssistantAgent {
  private logger = createLogger("AssistantAgent");

  constructor(
    private mcpClientGateway: McpClientGateway,
    private chatModel: ChatModelPort,
    private systemPrompt: string,
    private config: AssistantAgentConfig,
  ) {}
  // should I do it the cron worker style?
  async run(
    messages: ChatMessage[],
  ): Promise<{ response: string; newMessages: ChatMessage[] }> {
    this.logger.info("assistant run", {
      messagesLength: messages.length,
      maxSteps: this.config.maxSteps,
    });

    const maxSteps = this.config.maxSteps ?? 8;
    const startIndex = messages.length;

    for (let step = 0; step < maxSteps; step++) {
      const response = await this.chatModel.generate({
        systemInstruction: this.systemPrompt,
        messages,
        tools: await this.mcpClientGateway.listTools(),
      });

      this.logger.info("assistant response", {
        step,
        hasText: response.text.length > 0,
        tools: response.functionCalls.map(({ name }) => name),
      });

      messages.push(response.message);

      if (response.functionCalls.length === 0) {
        return {
          response: response.text,
          newMessages: messages.slice(startIndex),
        };
      }

      for (const call of response.functionCalls) {
        const callResult = await this.mcpClientGateway.safeToolCall(
          call.name,
          call.args,
        );

        messages.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: { result: callResult },
              },
            },
          ],
        });
      }
    }

    throw new MaxStepsExceededError(
      `Assistant agent exceeded max steps: ${maxSteps}`,
    );
  }
}
