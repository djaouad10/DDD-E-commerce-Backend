import { env } from "#/infrastructure/config/env.js";
import { getContext, getRequestId } from "../context/request-context.js";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId: string;
  userId?: string;
  service: string;
  component: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
};

class PerformanceTimer {
  constructor(private _startTime: number) {
    this._startTime = performance.now();
  }

  elapsed(): number {
    return Math.round(performance.now() - this._startTime);
  }
}

export class Logger {
  constructor(
    private readonly _serviceName: string,
    private readonly _component: string,
    private readonly _minLevel: LogLevel = env.LOG_LEVEL,
  ) {}

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
    timer?: PerformanceTimer,
  ): void {
    const levelPriority: Record<LogLevel, number> = {
      fatal: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
      trace: 5,
    };

    if (levelPriority[level] > levelPriority[this._minLevel]) return;

    const ctx = getContext();
    const requestId = getRequestId();
    const durationMs = timer?.elapsed();

    const entry: LogEntry = {
      level,
      message,
      component: this._component,
      service: this._serviceName,
      requestId,
      timestamp: new Date().toISOString(),
      ...(ctx?.userId && { userId: ctx?.userId }),
      ...(durationMs && { durationMs }),
      ...(metadata && { metadata }),
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        ...(error.stack && { stack: error.stack }),
      };
    }

    if (env.NODE_ENV === "production") {
      // production: JSON for log aggregation
      console.log(JSON.stringify(entry));
    } else {
      // development: human readable
      this.prettyPrint(entry);
    }
  }

  private prettyPrint(entry: LogEntry): void {
    const colors: Record<LogLevel, string> = {
      fatal: "\x1b[35m", // Magenta
      error: "\x1b[31m", // Red
      warn: "\x1b[33m", // Yellow
      info: "\x1b[36m", // Cyan
      debug: "\x1b[90m", // Gray
      trace: "\x1b[90m", // Gray
    };

    const reset = "\x1b[0m";
    const color = colors[entry.level];
    const levelStr = entry.level.toUpperCase().padEnd(5);
    const reqId = entry.requestId.slice(0, 8);
    const duration = entry.durationMs ? ` +${entry.durationMs}ms` : "";

    console.log(
      `${color}[${levelStr}]${reset} ` +
        `[${entry.timestamp.split("T")[1]!.split(".")[0]}] ` +
        `[${reqId}]${duration} ` +
        `${entry.message}`,
    );

    if (entry.metadata) {
      console.log(
        `  ${color}↳${reset}`,
        JSON.stringify(entry.metadata, null, 2),
      );
    }

    if (entry.error?.stack) {
      console.log(`  ${color}Stack:${reset}\n${entry.error.stack}`);
    }
  }

  fatal() {}
  error() {}
  warn() {}
  info() {}
  debug() {}
  trace() {}
}

export function createLogger() {}
