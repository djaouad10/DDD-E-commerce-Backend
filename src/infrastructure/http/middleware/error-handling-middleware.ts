import { getContext } from "#/shared/context/request-context.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { Request, Response, NextFunction } from "express";

const logger = createLogger("ErrorMiddleware");

//  Maps error codes to user-friendly messages.
//  Frontend uses these for toast notifications.

const userFriendlyMessages: Record<string, string> = {
  VALIDATION_ERROR: "Invalid {field}: {reason}.",
  BAD_REQUEST: "The request could not be processed.",
  NOT_FOUND: "{resource} with identifier '{identifier}' was not found.",
  INSUFFICIENT_INVENTORY:
    "Only {available} units are available, but {requested} were requested.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  FORBIDDEN: "You are not authorized to {action}.",
  CONFLICT: "{resource} with identifier '{identifier}' conflicts: {reason}.",
  MAX_STEPS_EXCEEDED:
    "The operation exceeded the maximum number of steps allowed.",
  MAX_CONTEXT_WINDOW_REACHED:
    "The maximum context window size has been reached. Please start a new conversation.",
  DATABASE_ERROR: "Something went wrong on our end. Please try again later.",
  GATEWAY_ERROR:
    "A service we depend on is temporarily unavailable. Please try again later.",
  GATEWAY_TIMEOUT_ERROR:
    "A service we depend on took too long to respond. Please try again later.",
  CONNECTION_ERROR:
    "We couldn't connect to a service we depend on. Please try again later.",
  MALFORMED_RESPONSE_ERROR:
    "A service we depend on returned an unexpected response. Please try again later.",
  DEPENDENCY_RESOLUTION_ERROR:
    "Something went wrong on our end. Please try again later.",
};

/**
 * The global error handler catches EVERYTHING.
 *
 * Responsibilities:
 * 1. Classify: operational vs programmer error
 * 2. Log: structured log with full context
 * 3. Respond: user-friendly message + requestId for support
 */
export function errorHandlingMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const errorObj = err as unknown as Record<string, unknown>;

  const ctx = getContext();
  const requestId = ctx?.requestId ?? "unknown";
  const isOperational = errorObj.isOperational === true;
  const code = (errorObj.code as string) || "INTERNAL_ERROR";
  const statusCode = (errorObj.statusCode as number) || 500;
  const details = (errorObj.details as Record<string, unknown>) || {};

  // Calculate total request duration
  const durationMs = ctx?.startTime
    ? Math.round(performance.now() - ctx.startTime)
    : undefined;

  if (isOperational) {
    // Expected business failure, warn level, no stack trace needed
    logger.warn("Operational error handled", {
      code,
      requestId,
      userId: ctx?.userId,
      path: ctx?.path,
      method: ctx?.method,
      statusCode,
      durationMs,
      details,
      message: err.message,
    });
  } else {
    // Unexpected failure — error level, full context for debugging
    logger.error("Unexpected error caught by middleware", err, {
      code,
      requestId,
      userId: ctx?.userId,
      path: ctx?.path,
      method: ctx?.method,
      statusCode,
      durationMs,
    });
  }

  // ─── RESPONSE BUILDING ───
  const template = userFriendlyMessages[code];
  const userMessage = template
    ? interpolate(template, details)
    : "Something went wrong on our end. Please try again later.";

  const response = {
    error: {
      code,
      message: userMessage,
      requestId,
      ...(isOperational && Object.keys(details).length > 0 ? { details } : {}),
    },
  };

  res.status(statusCode).json(response);
}

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String(vars[key] ?? `{${key}}`),
  );
}
