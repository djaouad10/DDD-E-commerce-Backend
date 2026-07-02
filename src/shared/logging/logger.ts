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

export class Logger {}

export function createLogger() {}
