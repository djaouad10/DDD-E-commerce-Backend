import type { AssistantAgent } from "#/application/ai/agents/assistant-agent.js";
import type { RunAssistantAgentQuery } from "#/application/queries/run-assistant-agent.query.js";
import { createLogger } from "#/shared/logging/logger.js";

export class RunAssistantAgentService {
  private logger = createLogger("RunAssistantAgentService");

  constructor(private agent: AssistantAgent) {}

  async execute(query: RunAssistantAgentQuery): Promise<{ response: string }> {
    this.logger.info("RunAssistantAgentService.execute called", { query });

    // here u fetch the messages history and pass it to the agent
    // I don't support this for now

    const { response, newMessages } = await this.agent.run([
      { role: "user", parts: [{ text: query.prompt }] },
    ]);

    this.logger.info("assistant response", {
      response,
      newMessagesCount: newMessages.length,
    });

    // here u save the new messages to the database
    // not supported yet

    return { response };
  }
}
