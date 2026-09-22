import type { TextEmbeddingModelPort } from "#/application/ports/ai/text-embedding-model.port.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GoogleGenAI } from "@google/genai";
import { handleGeminiClientErrors } from "../errors/handle-gemeni-client-errors.js";
import { GatewayError, ValidationError } from "#/shared/errors/errors.js";

export type config = {
  GEMINI_EMBEDDING_MODEL: string;
  EMBEDDING_DIMENSIONS: number;
};

export class GemeniTextEmbeddingModelAdapter implements TextEmbeddingModelPort {
  private logger = createLogger("GemeniTextEmbeddingModelAdapter");

  constructor(
    private gemeniClient: GoogleGenAI,
    private config: config,
  ) {}

  async embed(text: string[]): Promise<number[][]> {
    this.logger.info("embed called", { textCount: text.length });

    try {
      if (text.length >= 100)
        throw new ValidationError(
          "text",
          "text array length exceeds the gemeni limit for synchronous batched embeddings",
        );

      const response = await this.logger.measure(
        "gemeniClient.models.embedContent",
        () =>
          this.gemeniClient.models.embedContent({
            contents: text,
            model: this.config.GEMINI_EMBEDDING_MODEL,
            config: {
              outputDimensionality: this.config.EMBEDDING_DIMENSIONS,
            },
          }),
      );

      if (!response.embeddings)
        throw new GatewayError("Gemeni", new Error("No embeddings returned"));

      const embeddings = response.embeddings.map((embedding, index) => {
        if (!embedding.values)
          throw new GatewayError(
            "Gemeni",
            new Error(
              `no embedding values found for ${text[index] ?? `text[${index}]`}`,
            ),
          );

        return embedding.values;
      });

      this.logger.info("embed completed", {
        embeddingCount: embeddings.length,
      });

      // in the same order as provided in the batch request.
      return embeddings;
    } catch (error) {
      this.logger.error("Error embedding text", error as Error, { text });

      handleGeminiClientErrors(error, "GemeniTextEmbeddingModelAdapter.embed");
    }
  }
}
