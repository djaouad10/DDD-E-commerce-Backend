export type HttpRequestConfig = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export interface HttpResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string>;
  body: T;
}

export type BinaryHttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  buffer: Buffer;
  contentType: string;
  filename?: string | undefined;
};

export type HttpClient = {
  /**
   * Returns the response regardless of status code.
   * Caller (gateway) is responsible for checking statusCode.
   * T is the EXPECTED success body shape — error bodies are caller's responsibility.
   */
  request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>>;

  requestBinary(config: HttpRequestConfig): Promise<BinaryHttpResponse>;
};
