import type { AssistantAgent } from "#/application/ai/agents/assistant-agent.js";
import type { ChatMessage } from "#/application/ports/ai/chat-model.port.js";
import type {
  Conversation,
  ConversationRepository,
} from "#/application/ports/persistence/conversation.repository.js";
import type { RunAssistantAgentQuery } from "#/application/queries/run-assistant-agent.query.js";
import {
  ConflictError,
  ForbiddenError,
  MaxContextWindowReachedError,
  NotFoundError,
} from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";

export class RunAssistantAgentService {
  private logger = createLogger("RunAssistantAgentService");

  constructor(
    private agent: AssistantAgent,
    private conversationRepository: ConversationRepository,
  ) {}

  async execute(query: RunAssistantAgentQuery): Promise<{
    conversationId: string;
    response: string;
  }> {
    this.logger.info("RunAssistantAgentService.execute called", { query });

    let conversationId: string;
    let conversation: Conversation | null;

    if (query.conversationId) {
      conversationId = query.conversationId;
      conversation = await this.conversationRepository.find(conversationId);

      if (!conversation)
        throw new NotFoundError("conversation", conversationId);

      if (conversation.userId !== query.userId)
        throw new ForbiddenError(
          "continue conversation with assistant agent",
          query.userId,
        );

      if (conversation.maxContextWindowReached)
        throw new MaxContextWindowReachedError(conversationId);

      if (conversation.isProcessing)
        throw new ConflictError(
          "conversation",
          conversationId,
          "conversation is already processing",
        );

      await this.conversationRepository.claimConversation(conversationId); // a claim failure will throw
    } else {
      conversation = await this.conversationRepository.create(
        query.userId,
        "gemini-3.6-flash", // hardcoded for now, will be configurable later
      ); // conversationRepository.create claims convo by default

      conversationId = conversation.id;
    }

    const userMessage: ChatMessage = {
      role: "user",
      parts: [{ text: query.prompt }],
    };
    const messages: ChatMessage[] = [...conversation.messages, userMessage];

    try {
      const { response, newMessages } = await this.agent.run([...messages]);
      // returned newMessages don't include userMessage

      await this.conversationRepository.appendMessages(
        conversationId,
        [userMessage, ...newMessages],
        conversation.messages.length, // last existing convo message index + 1, so that new messages are gonna have a sequence starting right after the last existing convo message in DB
      );

      return { conversationId, response };
    } catch (error) {
      if (error instanceof MaxContextWindowReachedError) {
        await this.conversationRepository.setConversationCtxLimitAsReached(
          conversationId,
        );
      }

      throw error; // rethrow error
    } finally {
      await this.conversationRepository.releaseConversation(conversationId);
    }
  }
}
