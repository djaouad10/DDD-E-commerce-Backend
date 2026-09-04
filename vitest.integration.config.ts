import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/fixtures/integration-setup.ts"],
    include: ["src/**/*.integration.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist"],
    pool: "threads",
    fileParallelism: true,
    maxWorkers: 4,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage/integration",
    },
  },
});
