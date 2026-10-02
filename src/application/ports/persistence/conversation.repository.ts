import type { TransactionClient } from "#/shared/types/transaction-client.js";
import type { ChatMessage } from "../ai/chat-model.port.js";

export type Conversation = {
  id: string;
  userId: string;
  title: string | null;
  isProcessing: boolean;
  processingStartedAt: Date | null;
  maxContextWindowReached: boolean;
  modelId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationRepository = {
  /** returns an existing convo or null if not found */
  find(conversationId: string): Promise<Conversation | null>;
  /** creates and claims convo by default */
  create(userId: string, modelId: string): Promise<Conversation>;
  /** appends new messages to the existing convo */
  appendMessages(
    conversationId: string,
    newMessages: ChatMessage[],
  ): Promise<void>;
  /** isProcessing (claimed) && processingStartedAt > x minutes */
  findStuckConversations(): Promise<Conversation[]>;
  /** sets isProcessing to true and processingStartedAt to now, if failed to claim throw error */
  claimConversation(conversationId: string): Promise<void>;
  /** sets isProcessing to false and processingStartedAt to null */
  releaseConversation(conversationId: string): Promise<void>;
  /** deletes conversation forever*/
  deleteConversation(
    conversationId: string,
    tx: TransactionClient,
  ): Promise<void>;
  /** sets maxContextWindowReached flag to true */
  setConversationCtxLimitAsReached(conversationId: string): Promise<void>;
};
