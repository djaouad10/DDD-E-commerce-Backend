import {
  BadRequestError,
  ConflictError,
  GatewayError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./domain-error.js";

/**
 * Represents a non-2xx response from the WorldExpress API.
 * This is NOT a domain error — it's raw API failure data that
 * gets mapped to domain errors by handleWorldExpressErrors.
 */
export class WorldExpressApiError extends Error {
  readonly code = "WORLD_EXPRESS_API_ERROR";

  constructor(
    readonly statusCode: number,
    readonly responseBody: unknown,
    readonly url: string,
  ) {
    super(`WorldExpress API returned ${statusCode} at ${url}`);
    this.name = "WorldExpressApiError";
  }
}

export function handleWorldExpressErrors(
  error: unknown,
  context: string,
): never {
  if (error instanceof WorldExpressApiError) {
    switch (error.statusCode) {
      case 400:
        throw new BadRequestError(error.message, { context });

      case 403:
        throw new UnauthorizedError(
          "Access to the requested resource is forbidden.",
          "unknown-user",
        );

      case 404:
        throw new NotFoundError("Requested resource", "unknown");

      case 409:
        throw new ConflictError(
          "Resource conflict.",
          "unknown",
          "The request could not be completed due to a conflict with the current state of the target resource.",
        );

      case 429:
        throw new GatewayError("WorldExpress", error);

      case 422:
        const errorMessage = extractMessageFrom422Error(error.responseBody);
        throw new ValidationError("request", errorMessage);

      // Handles any other 4xx client errors (Bad Request, Unauthorized, Payment Required, etc.)
      case 402:
      case 405:
      case 406:
      case 407:
      case 408:
      case 410:
      case 411:
      case 412:
      case 413:
      case 414:
      case 415:
      case 416:
      case 417:
      case 418:
      case 421:
      case 423:
      case 424:
      case 426:
      case 428:
      case 431:
      case 451:
        throw new BadRequestError(error.message, {
          context,
          statusCode: error.statusCode,
        });

      // Handles any other 5xx server errors (Internal Server Error, Bad Gateway, Service Unavailable, etc.)
      case 500:
      case 501:
      case 502:
      case 503:
      case 504:
      case 505:
      case 506:
      case 507:
      case 508:
      case 510:
      case 511:
        throw new GatewayError("WorldExpress", error);

      // Fallback for any other unexpected status code
      default:
        throw new GatewayError(
          `WorldExpress (status: ${error.statusCode})`,
          error,
        );
    }
  }

  // If the error is not a WorldExpressApiError, it might be a network or connection error.
  throw new GatewayError("WorldExpress", error);
}

/**
 * A helper function to extract a user-friendly message from a 422 response.
 * Parses the typical Laravel validation error structure.
 * Example: { "message": "The given data was invalid.", "errors": { "tracking": ["Le champ tracking sélectionné est invalide."] } }
 */
function extractMessageFrom422Error(responseBody: unknown): string {
  if (typeof responseBody === "object" && responseBody !== null) {
    const body = responseBody as any;
    if (body.message && typeof body.message === "string") {
      return body.message;
    }
    if (body.errors) {
      const firstErrorMessage = getFirstErrorMessage(body.errors);
      if (firstErrorMessage) {
        return firstErrorMessage;
      }
    }
  }
  return "Invalid request parameters.";
}

/**
 * A helper to extract the first error message from a validation errors object.
 */
function getFirstErrorMessage(errors: Record<string, string[]>): string | null {
  for (const key in errors) {
    if (Array.isArray(errors[key]) && errors[key].length > 0) {
      return errors[key][0] ?? null;
    }
  }
  return null;
}
