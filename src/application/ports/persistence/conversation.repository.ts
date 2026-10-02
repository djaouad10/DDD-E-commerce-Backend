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
  /** creates and claims convo by default, throw if creation fails */
  create(userId: string, modelId: string): Promise<Conversation>;
  /** appends new messages to the existing convo */
  appendMessages(
    conversationId: string,
    newMessages: ChatMessage[],
    startIndex: number,
  ): Promise<void>;
  /** isProcessing (claimed) && processingStartedAt > x minutes */
  findStuckConversations(): Promise<Conversation[]>;
  /** sets isProcessing to true and processingStartedAt to now, if failed to claim throws error */
  claimConversation(conversationId: string): Promise<void>;
  /** sets isProcessing to false and processingStartedAt to null  if failed to release throws error*/
  releaseConversation(conversationId: string): Promise<void>;
  /** deletes conversation forever, throws if convo is still processing*/
  deleteConversation(
    conversationId: string,
    tx: TransactionClient,
  ): Promise<void>;
  /** sets maxContextWindowReached flag to true, throw if update failsS */
  setConversationCtxLimitAsReached(conversationId: string): Promise<void>;
};
