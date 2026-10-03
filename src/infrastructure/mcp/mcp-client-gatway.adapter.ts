import type {
  McpClientGateway,
  ToolDeclaration,
} from "#/application/ports/clients/mcp-client.gateway.js";
import { GatewayError } from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport";

export type McpClientGatewayConfig = {
  SERVER_URL: string;
  API_KEY: string;
};

export class McpClientGatwayAdapter implements McpClientGateway {
  private logger = createLogger("McpClientGatwayAdapter");

  private toolsMap: Map<string, ToolDeclaration> | null = null;

  constructor(
    private client: Client,
    private config: McpClientGatewayConfig,
  ) {}

  async loadTools(): Promise<void> {
    this.logger.info("loading mcp tools");

    const transport = new StreamableHTTPClientTransport(
      new URL(this.config.SERVER_URL),
      {
        requestInit: {
          headers: {
            authorization: `Bearer ${this.config.API_KEY}`,
          },
        },
      },
    );

    try {
      await this.logger.measure("client.connect", () =>
        this.client.connect(transport as Transport),
      );

      const { tools } = await this.logger.measure("client.listTools", () =>
        this.client.listTools(),
      );

      this.toolsMap = new Map();

      tools.map((tool) => {
        this.logger.info("loaded tool", { toolName: tool.name });

        this.toolsMap!.set(tool.name, {
          name: tool.name,
          description: tool.description ?? "",
          parameters: tool.inputSchema ?? {},
        });
      });
    } catch (error) {
      throw new GatewayError("MCP", error);
    }
  }

  async listTools(): Promise<ToolDeclaration[]> {
    this.logger.info("listing mcp tools");

    if (!this.toolsMap) {
      this.logger.info("loading mcp tools");
      await this.loadTools();
    }

    return [...(this.toolsMap ? this.toolsMap.values() : [])];
  }

  async safeToolCall(name: string, args: unknown): Promise<unknown> {
    this.logger.info("safe tool call", { name, args });
    try {
      // safeToolCall shouldn't throw when called in the middle of the agent loop
      if (!this.toolsMap) {
        this.logger.info("loading mcp tools");
        await this.loadTools();
      }

      const tool = this.toolsMap?.get(name);

      if (!tool) {
        const error = Error(`Tool ${name} not found`);

        this.logger.error("tool not found", error, { name });

        throw error;
      }

      if (!this.isObject(args)) {
        const error = new Error(
          `Invalid arguments for tool ${name}: expected an object`,
        );

        this.logger.error("invalid tool arguments", error, { name, args });

        throw error;
      }

      const result = await this.logger.measure("client.callTool", () =>
        this.client.callTool({
          name: tool.name,
          arguments: args,
        }),
      );

      if ("toolResult" in result) {
        return result.toolResult;
      }

      return {
        content: result.content,
        ...(result.structuredContent !== undefined && {
          structuredContent: result.structuredContent,
        }),
        ...(result.isError !== undefined && {
          isError: result.isError,
        }),
      };
    } catch (error) {
      return {
        content:
          error instanceof Error
            ? error.message
            : "tool call failed, unknown error",
        isError: true,
      };
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  // helpers
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
