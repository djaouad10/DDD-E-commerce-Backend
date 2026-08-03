import type { PostgresError } from "postgres";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  DatabaseError,
} from "#/shared/errors/domain-error.js";

const PG = {
  NOT_NULL_VIOLATION: "23502",
  FOREIGN_KEY_VIOLATION: "23503",
  UNIQUE_VIOLATION: "23505",
  CHECK_VIOLATION: "23514",
  EXCLUSION_VIOLATION: "23P01",
  INVALID_TEXT_REPRESENTATION: "22P02",
  NUMERIC_VALUE_OUT_OF_RANGE: "22003",
  STRING_DATA_RIGHT_TRUNCATION: "22001",
  INVALID_DATETIME_FORMAT: "22007",
  DATETIME_FIELD_OVERFLOW: "22008",
  UNDEFINED_TABLE: "42P01",
  UNDEFINED_COLUMN: "42703",
  DUPLICATE_TABLE: "42P07",
  DUPLICATE_COLUMN: "42701",
  CONNECTION_FAILURE: "08006",
  CONNECTION_DOES_NOT_EXIST: "08003",
  SERIALIZATION_FAILURE: "40001",
  DEADLOCK_DETECTED: "40P01",
  TOO_MANY_CONNECTIONS: "53300",
  DISK_FULL: "53100",
  OUT_OF_MEMORY: "53200",
} as const;

function extractPostgresError(error: unknown): PostgresError | null {
  if (isPostgresError(error)) {
    return error;
  }

  if (error instanceof Error && error.cause && isPostgresError(error.cause)) {
    return error.cause;
  }

  return null;
}

export function handleDrizzleErrors(err: unknown, context?: string): never {
  const pg = extractPostgresError(err);

  if (!pg) {
    throw new DatabaseError(
      err instanceof Error ? err.message : "Unknown database error",
      context ?? "unknown_operation",
      err,
    );
  }

  const code = pg.code;
  const detail = pg.detail ?? "";
  const constraint = pg.constraint_name;
  const column = pg.column_name;
  const table = pg.table_name ?? "record";

  switch (code) {
    // ── Domain-level integrity violations ──

    case PG.UNIQUE_VIOLATION: {
      const match = detail.match(/\(([^)]+)\)=\(([^)]+)\)/);
      const field = match?.[1] ?? constraint ?? "field";
      const value = match?.[2] ?? "value";
      throw new ConflictError(table, value, `Duplicate ${field}`);
    }

    case PG.FOREIGN_KEY_VIOLATION: {
      const match = detail.match(/\(([^)]+)\)=\(([^)]+)\)/);
      const field = match?.[1] ?? constraint ?? "reference";
      const value = match?.[2] ?? "unknown";
      const resource = field.replace(/_id$/, "").replace(/_/g, " ");
      throw new NotFoundError(resource, value);
    }

    case PG.NOT_NULL_VIOLATION: {
      throw new ValidationError(column ?? constraint ?? "field", "is required");
    }

    case PG.CHECK_VIOLATION: {
      throw new ValidationError(
        table,
        `Check constraint '${constraint ?? "unknown"}' violated`,
      );
    }

    case PG.EXCLUSION_VIOLATION: {
      throw new ConflictError(
        table,
        "exclusion",
        "Conflicts with an existing record",
      );
    }

    // ── Data format errors (client's fault) ──

    case PG.INVALID_TEXT_REPRESENTATION:
      throw new ValidationError(column ?? "input", "Invalid format or type");

    case PG.NUMERIC_VALUE_OUT_OF_RANGE:
      throw new ValidationError(
        column ?? "numeric field",
        "Value out of range",
      );

    case PG.STRING_DATA_RIGHT_TRUNCATION:
      throw new ValidationError(column ?? "text field", "Value too long");

    case PG.INVALID_DATETIME_FORMAT:
    case PG.DATETIME_FIELD_OVERFLOW:
      throw new ValidationError(
        column ?? "datetime field",
        "Invalid date/time",
      );

    // ── Transaction / concurrency (client can retry) ──

    case PG.SERIALIZATION_FAILURE:
    case PG.DEADLOCK_DETECTED:
      throw new ConflictError(
        table,
        "concurrent modification",
        "Transaction conflict — please retry",
      );

    // ── Schema errors (programmer error / bad migration) ──

    case PG.UNDEFINED_TABLE:
    case PG.UNDEFINED_COLUMN:
    case PG.DUPLICATE_TABLE:
    case PG.DUPLICATE_COLUMN:
      throw new DatabaseError(
        `Schema error [${code}]: ${pg.message}`,
        context ?? "schema_operation",
        pg,
      );

    // ── Infrastructure / connection errors ──

    case PG.CONNECTION_FAILURE:
    case PG.CONNECTION_DOES_NOT_EXIST:
    case PG.TOO_MANY_CONNECTIONS:
    case PG.DISK_FULL:
    case PG.OUT_OF_MEMORY:
      throw new DatabaseError(
        `Infrastructure error [${code}]: ${pg.message}`,
        context ?? "connection_operation",
        pg,
      );

    // ── Unknown PG error ──

    default:
      throw new DatabaseError(
        `Unhandled Postgres error [${code}]: ${pg.message}`,
        context ?? "unknown_operation",
        pg,
      );
  }
}

function isPostgresError(error: unknown): error is PostgresError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}
