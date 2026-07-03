import { getContext } from "#/shared/context/request-context.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { Request, Response, NextFunction } from "express";

const logger = createLogger("ErrorMiddleware");

//  Maps error codes to user-friendly messages.
//  Frontend uses these for toast notifications.

const userFriendlyMessages: Record<string, string> = {
  VALIDATION_ERROR: "Please check your information and try again.",
  NOT_FOUND: "We couldn't find what you're looking for.",
  INSUFFICIENT_INVENTORY:
    "Only {available} items left in stock. Please reduce quantity.",
  ORDER_ALREADY_PAID: "This order has already been paid.",
  PAYMENT_DECLINED:
    "Your payment was declined. Please try another card or contact your bank.",
  UNAUTHORIZED: "You don't have permission to do that.",
  DATABASE_ERROR: "Something went wrong on our end. Please try again later.",
  EXTERNAL_API_ERROR:
    "A service we depend on is temporarily unavailable. Please try again.",
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
  const ctx = getContext();
  const requestId = ctx?.requestId ?? "unknown";
  const isOperational = (err as any).isOperational === true;
  const code = (err as any).code || "INTERNAL_ERROR";
  const statusCode = (err as any).statusCode || 500;
  const details = (err as any).details || {};

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
