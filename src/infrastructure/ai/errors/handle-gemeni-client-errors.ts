import { ApiError } from "@google/genai";
import {
  BadRequestError,
  ConflictError,
  DomainError,
  ForbiddenError,
  GatewayError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "#/shared/errors/errors.js";

function extractGeminiError(error: unknown): ApiError | null {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error && error.cause) {
    return extractGeminiError(error.cause);
  }

  return null;
}

export function handleGeminiClientErrors(
  err: unknown,
  context?: string,
): never {
  if (err instanceof DomainError) {
    throw err;
  }

  const geminiError = extractGeminiError(err);

  if (!geminiError) {
    throw new GatewayError("Gemini", err);
  }

  const statusCode =
    typeof geminiError.status === "number"
      ? geminiError.status
      : extractStatusCodeFromMessage(geminiError.message);

  const errorMessage = geminiError.message || "Gemini API request failed";

  switch (statusCode) {
    case 400: {
      if (
        errorMessage.toLowerCase().includes("safety") ||
        errorMessage.toLowerCase().includes("blocked")
      ) {
        throw new ValidationError(
          "prompt",
          "Blocked by safety filters or policy",
        );
      }
      throw new BadRequestError(errorMessage, {
        context: context ?? "gemini_operation",
        originalError: geminiError,
      });
    }

    case 401:
      throw new UnauthorizedError("Invalid or missing Gemini API credentials");

    case 403:
      throw new ForbiddenError(
        `access Gemini API resource (${context ?? "generate_content"})`,
      );

    case 404:
      throw new NotFoundError(
        "Gemini Model / Resource",
        context ?? "requested_model",
      );

    case 409:
      throw new ConflictError(
        "Gemini Resource",
        context ?? "state_conflict",
        errorMessage,
      );

    case 422:
      throw new ValidationError("request_body", errorMessage);

    case 429:
      throw new GatewayError(
        `Gemini (Rate Limit Exceeded - ${context ?? "request"})`,
        geminiError,
      );

    case 500:
    case 502:
    case 503:
    case 504:
      throw new GatewayError(
        `Gemini (Upstream Service Error ${statusCode})`,
        geminiError,
      );

    default:
      throw new GatewayError(
        `Gemini (${statusCode ? `status: ${statusCode}` : "Unknown Error"})`,
        geminiError,
      );
  }
}

/**
 * Utility to parse standard status code patterns (e.g., "[400 Bad Request]")
 * when statusCode is not explicitly attached as a top-level property.
 */
function extractStatusCodeFromMessage(message: string): number | null {
  const match = message.match(/\[(\d{3})\]/) || message.match(/\b(\d{3})\b/);
  if (match && match[1]) {
    const code = parseInt(match[1], 10);
    return code >= 400 && code < 600 ? code : null;
  }
  return null;
}
