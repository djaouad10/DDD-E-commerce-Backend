import { Client } from "@modelcontextprotocol/sdk/client";

export function createMcpClient(config: {
  clientName: string;
  version: string;
}) {
  return new Client({
    name: config.clientName,
    version: config.version,
  });
}
