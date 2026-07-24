export type HttpRequestConfig = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
};

export interface HttpResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string>;
  body: T;
}

export type HttpClient = {
  request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
  requestRaw(config: HttpRequestConfig): Promise<Response>;
};
