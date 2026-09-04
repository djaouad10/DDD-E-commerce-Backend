import type { Container } from "#/composition/utils/container.js";
import { buildIntegrationTestsContainer } from "#/composition/roots/tests/integration-tests-composition.js";
import { createServer } from "#/infrastructure/http/server/index.js";
import type { Express } from "express";
import nock from "nock";

let app: Express;

export function createTestApp(): { app: Express; container: Container } {
  // Deny ALL outgoing HTTP by default
  nock.disableNetConnect();
  // Allow localhost ONLY for any test-specific needs (rare)
  nock.enableNetConnect("127.0.0.1");

  const container = buildIntegrationTestsContainer();
  app = createServer(container);

  return { app, container };
}

export function cleanupTestApp(): void {
  nock.cleanAll();
}
