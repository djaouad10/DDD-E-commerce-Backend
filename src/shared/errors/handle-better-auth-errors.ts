import { isAPIError } from "better-auth/api";

import {
  BadRequestError,
  ConflictError,
  DomainError,
  ForbiddenError,
  GatewayError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors.js";

export function handleBetterAuthErrors(error: unknown, context: string): never {
  if (error instanceof DomainError) {
    throw error;
  }

  if (isAPIError(error)) {
    switch (error.status) {
      case "UNAUTHORIZED":
        throw new UnauthorizedError(error.message);

      case "FORBIDDEN":
        throw new ForbiddenError(
          "perform this authentication action",
          "unknown",
        );

      case "BAD_REQUEST":
        throw new BadRequestError(error.message, {
          context,
          betterAuthCode: error.body?.code,
        });

      case "UNPROCESSABLE_ENTITY":
        throw new ValidationError("request", error.message);

      case "NOT_FOUND":
        throw new NotFoundError("Authentication resource", "unknown");

      case "CONFLICT":
        throw new ConflictError(
          "Authentication resource",
          "unknown",
          error.message,
        );

      case "PAYMENT_REQUIRED":
      case "METHOD_NOT_ALLOWED":
      case "NOT_ACCEPTABLE":
      case "REQUEST_TIMEOUT":
      case "LENGTH_REQUIRED":
      case "PAYLOAD_TOO_LARGE":
      case "URI_TOO_LONG":
      case "UNSUPPORTED_MEDIA_TYPE":
      case "RANGE_NOT_SATISFIABLE":
      case "EXPECTATION_FAILED":
      case "I'M_A_TEAPOT":
      case "MISDIRECTED_REQUEST":
      case "LOCKED":
      case "FAILED_DEPENDENCY":
      case "TOO_EARLY":
      case "UPGRADE_REQUIRED":
      case "PRECONDITION_REQUIRED":
      case "REQUEST_HEADER_FIELDS_TOO_LARGE":
      case "UNAVAILABLE_FOR_LEGAL_REASONS":
        throw new BadRequestError(error.message, {
          context,
          status: error.status,
          betterAuthCode: error.body?.code,
        });

      case "INTERNAL_SERVER_ERROR":
      case "NOT_IMPLEMENTED":
      case "BAD_GATEWAY":
      case "SERVICE_UNAVAILABLE":
      case "HTTP_VERSION_NOT_SUPPORTED":
      case "VARIANT_ALSO_NEGOTIATES":
      case "INSUFFICIENT_STORAGE":
      case "LOOP_DETECTED":
      case "NOT_EXTENDED":
      case "NETWORK_AUTHENTICATION_REQUIRED":
        throw new GatewayError("Better Auth", error);

      case "TOO_MANY_REQUESTS":
        throw new GatewayError("Better Auth", error);

      default:
        throw new GatewayError("Better Auth", error);
    }
  }

  throw new GatewayError("Better Auth", error);
}
