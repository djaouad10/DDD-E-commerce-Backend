import { buildAssistantAgentContainer } from "#/composition/roots/assistant-agent.composition.js";
import {
  ASSISTANT_AGENT,
  MCP_CLIENT_GATEWAY,
} from "#/composition/utils/tokens.js";
import { createLogger } from "#/shared/logging/logger.js";
import readLine from "readline/promises";

const logger = createLogger("agent-entrypoint");

async function bootstrap() {
  const container = buildAssistantAgentContainer();
  const scope = container.createScope();

  const mcpClientGateway = scope.resolve(MCP_CLIENT_GATEWAY);
  const assistantAgent = scope.resolve(ASSISTANT_AGENT);

  await mcpClientGateway.loadTools();

  const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  logger.info("agent ready — type your message, 'exit' to quit");

  while (true) {
    const input = (await rl.question("you> ")).trim();
    if (input === "exit") break;

    const { response } = await assistantAgent.run([
      { role: "user", parts: [{ text: input }] },
    ]);

    console.log(`agent> ${response}\n`);
  }

  await mcpClientGateway.close();
  rl.close();
}

bootstrap().catch((e) => {
  logger.error("agent crashed", e as Error);
  process.exit(1);
});
