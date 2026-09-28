import type { ToolDeclaration } from "../clients/mcp-client.gateway.js";

export type ChatTextPart = {
  text: string;
};

export type ChatFunctionCallPart = {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
  };
};

export type ChatFunctionResponsePart = {
  functionResponse: {
    name: string;
    response: { result: unknown };
  };
};

export type ChatPart =
  | ChatTextPart
  | ChatFunctionCallPart
  | ChatFunctionResponsePart;

export type ChatMessage = {
  role: "user" | "model";
  parts: ChatPart[];
  /**
   * Opaque, adapter-owned continuation state. Some providers return reasoning
   * state (signatures, encrypted reasoning items) that must be sent back
   * unmodified on the next turn. The application never inspects this; it only
   * keeps it attached to the message. Must be JSON-serializable.
   */
  providerState?: unknown;
};

export type GenerateParams = {
  systemInstruction: string;
  messages: ChatMessage[];
  tools?: ToolDeclaration[];
  temperature?: number;
};

export type GenerateResult = {
  message: ChatMessage;
  text: string;
  functionCalls: { name: string; args: Record<string, unknown> }[];
};

export type ChatModelPort = {
  generate(params: GenerateParams): Promise<GenerateResult>;
};
