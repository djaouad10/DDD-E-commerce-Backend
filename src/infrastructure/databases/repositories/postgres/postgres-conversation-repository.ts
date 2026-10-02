import type {
  Conversation,
  ConversationRepository,
} from "#/application/ports/persistence/conversation.repository.js";
import type {
  DrizzleDBClient,
  DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import {
  ConflictError,
  DatabaseError,
  NotFoundError,
} from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { and, eq } from "drizzle-orm";
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

  async deleteConversation(
    conversationId: string,
    tx: TransactionClient,
  ): Promise<void> {
    this.logger.debug("deleteConversation called", { conversationId });

    const db = tx as DrizzleTransactionClient;

    try {
      const [deletedRow] = await this.logger.measure(
        "db.delete(conversation)",
        () =>
          db
            .delete(conversation)
            .where(
              and(
                eq(conversation.id, conversationId),
                eq(conversation.is_processing, false),
              ),
            )
            .returning(),
      );

      if (!deletedRow) {
        // if(!deleteRow) could either mean the convo doesn't exist or it's still processing, I assume that the service calling this already checked the existence of the convo.
        this.logger.debug("conversation deletion failed", { conversationId });

        throw new ConflictError(
          "conversation",
          conversationId,
          "can't delete a processing conversation",
        );
      }

      this.logger.debug("conversation deleted", { conversationId });
    } catch (error) {
      this.logger.error("deleteConversation failed", error as Error, {
        conversationId,
      });

      handleDrizzleErrors(error, "PostgresConversationRepository.delete");
    }
  }

  async setConversationCtxLimitAsReached(
    conversationId: string,
  ): Promise<void> {
    this.logger.debug("setConversationCtxLimitAsReached called", {
      conversationId,
    });

    try {
      const [row] = await this.logger.measure("db.update(conversation)", () =>
        this.db
          .update(conversation)
          .set({ max_context_window_reached: true })
          .where(eq(conversation.id, conversationId))
          .returning(),
      );

      if (!row) {
        this.logger.debug("conversation update failed", { conversationId });

        throw new NotFoundError("conversation", conversationId);
      }

      this.logger.debug("conversation updated", { conversationId });
    } catch (error) {
      this.logger.error(
        "setConversationCtxLimitAsReached failed",
        error as Error,
        {
          conversationId,
        },
      );

      handleDrizzleErrors(
        error,
        "PostgresConversationRepository.setConversationCtxLimitAsReached",
      );
    }
  }

  async claimConversation(conversationId: string): Promise<void> {
    this.logger.debug("claimConversation called", { conversationId });

    try {
      const [row] = await this.logger.measure("db.update(conversation)", () =>
        this.db
          .update(conversation)
          .set({ is_processing: true, processing_started_at: new Date() })
          .where(
            and(
              eq(conversation.id, conversationId),
              eq(conversation.is_processing, false),
            ),
          )
          .returning({ id: conversation.id }),
      );

      if (!row) {
        this.logger.debug("conversation claim failed", { conversationId });

        throw new ConflictError(
          "conversation",
          conversationId,
          "can't claim a processing conversation",
        );
      }

      this.logger.debug("conversation claimed", { conversationId });
    } catch (error) {
      this.logger.error("claimConversation failed", error as Error, {
        conversationId,
      });

      handleDrizzleErrors(
        error,
        "PostgresConversationRepository.claimConversation",
      );
    }
  }
}
