import type {
  ChatMessage,
  ChatModelPort,
  ChatPart,
  GenerateParams,
  GenerateResult,
} from "#/application/ports/ai/chat-model.port.js";
import { createLogger } from "#/shared/logging/logger.js";
import type {
  Candidate,
  Content,
  GenerateContentResponse,
  GoogleGenAI,
  Part,
} from "@google/genai";
import { handleGeminiClientErrors } from "../errors/handle-gemeni-client-errors.js";
import { GatewayError } from "#/shared/errors/errors.js";

export type GemeniChatModelAdapterConfig = {
  GEMENI_CHAT_MODEL: string;
};

export class GemeniChatModelAdapter implements ChatModelPort {
  private logger = createLogger("GemeniChatModelAdapter");

  constructor(
    private chatClient: GoogleGenAI,
    private config: GemeniChatModelAdapterConfig,
  ) {}

  async generate(params: GenerateParams): Promise<GenerateResult> {
    this.logger.info("generate called", { params });

    const { messages, systemInstruction, temperature, tools } = params;
    try {
      const response = await this.logger.measure(
        "chatClient.models.generateContent",
        () =>
          this.chatClient.models.generateContent({
            model: this.config.GEMENI_CHAT_MODEL,
            contents: messages,
            config: {
              temperature: temperature !== undefined ? temperature : 0.2,
              systemInstruction,
              ...(tools &&
                tools.length > 0 && {
                  tools: [{ functionDeclarations: tools }],
                }),
            },
          }),
      );

      this.logUsage(response);

      return this.normalizeResponse(response.candidates);
    } catch (error) {
      this.logger.error("generate failed", error as Error, { params });

      handleGeminiClientErrors(error, "GemeniChatModelAdapter.generate");
    }
  }

  private normalizeResponse(
    candidates: Candidate[] | undefined,
  ): GenerateResult {
    const candidate = this.requireCandidate(candidates);
    const content = this.requireContent(candidate);
    const parts = content.parts ?? [];

    const normalizedParts: ChatPart[] = parts.flatMap((part) =>
      this.normalizePart(part),
    );

    const message: ChatMessage = {
      role: "model",
      parts: normalizedParts,
    };

    return {
      message,
      text: normalizedParts
        .filter(
          (part): part is Extract<ChatPart, { text: string }> => "text" in part,
        )
        .map((part) => part.text)
        .join(""),

      functionCalls: normalizedParts.flatMap((part) =>
        "functionCall" in part ? [part.functionCall] : [],
      ),
    };
  }

  private requireCandidate(candidates: Candidate[] | undefined): Candidate {
    const candidate = candidates?.[0];

    if (!candidate) {
      throw new GatewayError(
        "Gemini",
        new Error("Response contains no candidate"),
      );
    }

    return candidate;
  }

  private requireContent(candidate: Candidate): Content {
    const content = candidate.content;

    if (!content) {
      throw new GatewayError(
        "Gemini",
        new Error("Candidate contains no content"),
      );
    }

    return content;
  }

  private normalizePart(part: Part): ChatPart[] {
    if (part.text !== undefined) {
      return [{ text: part.text }];
    }

    if (part.functionCall !== undefined) {
      const { name, args } = part.functionCall;

      if (!name) {
        throw new GatewayError(
          "Gemini",
          new Error("Function call contains no name"),
        );
      }

      return [
        {
          functionCall: {
            name,
            args: this.isObject(args) ? args : {},
          },
        },
      ];
    }

    // This port intentionally supports only text and function calls.
    return [];
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private logUsage(response: GenerateContentResponse): void {
    const usage = response.usageMetadata;

    if (!usage) {
      this.logger.warn("Gemini usage metadata unavailable", {
        model: this.config.GEMENI_CHAT_MODEL,
      });

      return;
    }

    this.logger.info("Gemini token usage", {
      model: this.config.GEMENI_CHAT_MODEL,

      promptTokenCount: usage.promptTokenCount,
      candidatesTokenCount: usage.candidatesTokenCount,
      totalTokenCount: usage.totalTokenCount,

      ...(usage.cachedContentTokenCount !== undefined && {
        cachedContentTokenCount: usage.cachedContentTokenCount,
      }),

      ...(usage.thoughtsTokenCount !== undefined && {
        thoughtsTokenCount: usage.thoughtsTokenCount,
      }),

      ...(usage.toolUsePromptTokenCount !== undefined && {
        toolUsePromptTokenCount: usage.toolUsePromptTokenCount,
      }),
    });
  }
}
