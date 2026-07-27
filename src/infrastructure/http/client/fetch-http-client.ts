import type {
  HttpClient,
  HttpRequestConfig,
  HttpResponse,
  BinaryHttpResponse,
} from "./http-client.js";
import {
  HttpConnectionError,
  HttpTimeoutError,
  HttpMalformedResponseError,
} from "#/shared/errors/domain-error.js";

export class FetchHttpClient implements HttpClient {
  constructor(private readonly defaultTimeoutMs: number = 30000) {}

  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.executeFetch(config);
    const body = await this.parseJsonBody<T>(response);

    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  }

  async requestBinary(config: HttpRequestConfig): Promise<BinaryHttpResponse> {
    const response = await this.executeFetch(config);
    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      buffer,
      contentType:
        response.headers.get("content-type") ?? "application/octet-stream",
      filename: this.extractFilename(
        response.headers.get("content-disposition"),
      ),
    };
  }

  private async executeFetch(config: HttpRequestConfig): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs = config.timeoutMs ?? this.defaultTimeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(config.url, {
        method: config.method,
        headers: {
          ...(config.body ? { "Content-Type": "application/json" } : {}),
          ...config.headers,
        },
        ...(config.body ? { body: JSON.stringify(config.body) } : {}),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new HttpTimeoutError(config.url, timeoutMs);
      }
      throw new HttpConnectionError(config.url, err);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseJsonBody<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.status === 205) {
      return undefined as unknown as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // For non-JSON responses in request<T>(), return text cast (gateway handles)
      const text = await response.text();
      return text as unknown as T;
    }

    const text = await response.text();
    if (!text) return undefined as unknown as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new HttpMalformedResponseError(
        response.url,
        `Expected JSON, got: ${text.slice(0, 200)}`,
      );
    }
  }

  private extractFilename(disposition: string | null): string | undefined {
    if (!disposition) return undefined;
    const match = disposition.match(/filename="?([^"]+)"?/);
    return match?.[1];
  }
}
