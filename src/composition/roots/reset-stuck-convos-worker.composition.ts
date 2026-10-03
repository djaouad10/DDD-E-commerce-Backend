import { ResetStuckConvosService } from "#/application/services/stuck-convos-resetter/reset-stuck-convos.service.js";
import { createDrizzleDB } from "#/infrastructure/config/database.js";
import { convoResetterEnv } from "#/infrastructure/config/env/env.convo-resetter.js";
import { PostgresConversationRepository } from "#/infrastructure/databases/repositories/postgres/postgres-conversation-repository.js";
import { Container } from "../utils/container.js";
import {
  CONVERSATION_REPOSITORY,
  DRIZZLE_DB,
  RESET_STUCK_CONVOS_SERVICE,
} from "../utils/tokens.js";

export function buildResetStuckConvosWorkerContainer(): Container {
  const container = new Container();

  const db = createDrizzleDB({
    connectionUrl: convoResetterEnv.DATABASE_URL,
    maxPoolSize: 5,
    debug: convoResetterEnv.DEBUG_DB,
  });

  container.registerInstance(DRIZZLE_DB, db);

  container.register(
    CONVERSATION_REPOSITORY,
    (scope) => new PostgresConversationRepository(scope.resolve(DRIZZLE_DB)),
    "singleton",
  );

  container.register(
    RESET_STUCK_CONVOS_SERVICE,
    (scope) =>
      new ResetStuckConvosService(scope.resolve(CONVERSATION_REPOSITORY)),
    "scoped",
  );

  return container;
}
