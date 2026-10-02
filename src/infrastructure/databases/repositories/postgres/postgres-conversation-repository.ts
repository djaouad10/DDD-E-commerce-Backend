import type {
  Conversation,
  ConversationRepository,
} from "#/application/ports/persistence/conversation.repository.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { DatabaseError } from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleDrizzleErrors } from "../../errors/handle-drizzle-errors.js";
import { conversation } from "../../schema.js";
import { generateConversationId } from "../../utils.js";

export class PostgresConversationRepository implements ConversationRepository {
  private logger = createLogger("PostgresConversationRepository");

  constructor(private db: DrizzleDBClient) {}

  async find(conversationId: string): Promise<Conversation | null> {
    this.logger.debug("find called", { conversationId });

    try {
      const row = await this.logger.measure(
        "db.query.conversation.findFirst",
        () =>
          this.db.query.conversation.findFirst({
            where: (conversation, { eq }) =>
              eq(conversation.id, conversationId),
            with: {
              messages: true,
            },
          }),
      );

      if (!row) {
        this.logger.debug("conversation not found", { conversationId });

        return null;
      }

      const conversation: Conversation = {
        id: row.id,
        title: row.title,
        userId: row.user_id,
        isProcessing: row.is_processing,
        processingStartedAt: row.processing_started_at,
        maxContextWindowReached: row.max_context_window_reached,
        modelId: row.model_id,
        messages: row.messages.map((message) => ({
          role: message.role,
          parts: message.parts,
          providerState: message.provider_state,
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      this.logger.debug("conversation found", {
        conversationId,
        userId: row.user_id,
        messagesCount: row.messages.length,
        isProcessing: row.is_processing,
        maxContextWindowReached: row.max_context_window_reached,
      });

      return conversation;
    } catch (error) {
      this.logger.error("find failed", error as Error, { conversationId });

      handleDrizzleErrors(error, "PostgresConversationRepository.find");
    }
  }

  async create(userId: string, modelId: string): Promise<Conversation> {
    this.logger.debug("create called", { userId, modelId });

    try {
      const [row] = await this.logger.measure("db.insert(conversation)", () =>
        this.db
          .insert(conversation)
          .values({
            id: generateConversationId(),
            user_id: userId,
            model_id: modelId,
            is_processing: true, // claimed by default
            processing_started_at: new Date(),
            max_context_window_reached: false,
            title: "New conversation",
          })
          .returning(),
      );

      if (!row) {
        this.logger.debug("conversation creation failed", { userId, modelId });

        throw new DatabaseError(
          "conversation creation failed",
          "PostgresConversationRepository.create",
          new Error("conversation creation failed"),
        );
      }

      const convo: Conversation = {
        id: row.id,
        title: row.title,
        userId: row.user_id,
        isProcessing: row.is_processing,
        processingStartedAt: row.processing_started_at,
        maxContextWindowReached: row.max_context_window_reached,
        modelId: row.model_id,
        messages: [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      this.logger.debug("conversation created", {
        userId,
        modelId,
        conversationId: row.id,
      });

      return convo;
    } catch (error) {
      this.logger.error("create failed", error as Error, { userId, modelId });

      handleDrizzleErrors(error, "PostgresConversationRepository.create");
    }
  }
}
