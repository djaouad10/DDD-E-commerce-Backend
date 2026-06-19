import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/fixtures/global-setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist"],
  },
});
