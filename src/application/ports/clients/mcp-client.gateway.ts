import type { ToolDeclaration } from "../ai/chat-model.port.js";

export type McpToolsMap = Map<string, ToolDeclaration>;

export type McpClientGateway = {
  /** load and store mcp tools declarations in adapter cache, called at bootstrap */
  loadTools(): Promise<void>;

  /** return cached tools declarations, if none exist, load them first */
  listTools(): Promise<McpToolsMap>;

  safeToolCall(name: string, args: unknown): Promise<unknown>;
};
