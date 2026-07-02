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
}

class PerformanceTimer {}

export class Logger {}

export function createLogger() {}
