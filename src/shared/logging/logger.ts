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

export class PerformanceTimer {
  private _startTime: number;
  constructor() {
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
        `[${entry.component}] ` +
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

  fatal(message: string, error: Error): never {
    this.log("fatal", message, {}, error);
    process.exit(1);
  }

  error(
    message: string,
    error: Error,
    metadata?: Record<string, unknown>,
  ): void {
    this.log("error", message, metadata, error);
  }
  warn(
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.log("warn", message, metadata, error);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log("debug", message, metadata);
  }

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log("trace", message, metadata);
  }

  measure<T>(operation: string, fn: () => T): T;
  measure<T>(operation: string, fn: () => Promise<T>): Promise<T>;
  measure<T>(operation: string, fn: () => T | Promise<T>): T | Promise<T> {
    const timer = new PerformanceTimer();
    this.trace(`${operation} started`);

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result
          .then((value) => {
            this.info(`${operation} completed`, {
              durationMs: timer.elapsed(),
            });
            return value;
          })
          .catch((error) => {
            this.warn(`${operation} failed`, { durationMs: timer.elapsed() });
            throw error;
          });
      }

      this.info(`${operation} completed`, { durationMs: timer.elapsed() });
      return result;
    } catch (error) {
      this.warn(`${operation} failed`, { durationMs: timer.elapsed() });
      throw error;
    }
  }

  startTimer(operation: string): {
    end: (metadata?: Record<string, unknown>) => void;
  } {
    const timer = new PerformanceTimer();
    this.trace(`${operation} started`);

    return {
      end: (metadata?: Record<string, unknown>) => {
        this.info(`${operation} completed`, {
          ...metadata,
          durationMs: timer.elapsed(),
        });
      },
    };
  }
}

const SERVICE_NAME = env.SERVICE_NAME || "not-specified";

export function createLogger(component: string) {
  return new Logger(SERVICE_NAME, component);
}
