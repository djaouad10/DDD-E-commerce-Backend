import type { UserRole } from "#/domain/entities/user.js";
import { AsyncLocalStorage } from "async_hooks";

export interface ContextStore {
  requestId: string;

  userId?: string;

  userRole?: UserRole;

  path?: string;

  method?: string;

  startTime: number;

  clientIp?: string;

  jobId?: string;

  queueName?: string;
}

const requestContext = new AsyncLocalStorage<ContextStore>();

export function runWithContext<T>(store: ContextStore, fn: () => T): T {
  return requestContext.run(store, fn);
}

export function getContext(): ContextStore | undefined {
  return requestContext.getStore();
}

export function getRequestId(): string {
  return getContext()?.requestId ?? "unknown";
}
