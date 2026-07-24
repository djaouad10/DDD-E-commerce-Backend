type ErrorCodes =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INSUFFICIENT_INVENTORY"
  | "UNAUTHORIZED"
  | "DATABASE_ERROR"
  | "GATEWAY_ERROR"
  | "CONFLICT"
  | "BAD_REQUEST";

export abstract class DomainError extends Error {
  abstract readonly code: ErrorCodes;
  abstract readonly statusCode: number;
  readonly isOperational = true;

  readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;

  constructor(field: string, reason: string) {
    super(`Invalid ${field}: ${reason}`, { field, reason });
  }
}

export class BadRequestError extends DomainError {
  readonly code = "BAD_REQUEST";
  readonly statusCode = 400;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details ?? {});
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;

  constructor(resource: string, identifier: string) {
    super(`${resource} with identifier '${identifier}' not found`, {
      resource,
      identifier,
    });
  }
}

export class InsufficientInventoryError extends DomainError {
  readonly code = "INSUFFICIENT_INVENTORY";
  readonly statusCode = 409;

  constructor(productId: string, requested: number, available: number) {
    super(`Only ${available} units available, ${requested} requested`, {
      productId,
      requested,
      available,
    });
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 403;

  constructor(action: string, userId: string) {
    super(`Not authorized to ${action}`, { action, userId });
  }
}

export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
  readonly statusCode = 409;

  constructor(resource: string, identifier: string, reason: string) {
    super(`${resource} with identifier '${identifier}' conflicts: ${reason}`, {
      resource,
      identifier,
      reason,
    });
  }
}

// infrastructure errors (unexpected):

export class DatabaseError extends Error {
  readonly code = "DATABASE_ERROR";
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(
    message: string,
    readonly operation: string,
    readonly originalError: unknown,
  ) {
    super(message);
  }
}

export class GatewayError extends Error {
  readonly code = "GATEWAY_ERROR";
  readonly statusCode = 502;
  readonly isOperational = false;

  constructor(
    readonly service: string,
    readonly originalError: unknown,
  ) {
    super(`Gateway '${service}' failed`);
  }
}
