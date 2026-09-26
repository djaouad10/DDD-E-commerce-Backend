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
