import { buildIntegrationTestsContainer } from "#/composition/tests/integration-tests-composition.js";
import { createServer } from "#/infrastructure/http/server/index.js";
import type { Express } from "express";
import nock from "nock";

let app: Express;

export function createTestApp(): Express {
  // Deny ALL outgoing HTTP by default
  nock.disableNetConnect();
  // Allow localhost ONLY for any test-specific needs (rare)
  // nock.enableNetConnect("127.0.0.1");
  // usually not needed since no server starts

  const container = buildIntegrationTestsContainer();
  app = createServer(container);

  return app;
}

export function cleanupTestApp(): void {
  nock.cleanAll();
}
