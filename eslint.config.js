import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },

  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ["**/*.test.ts", "**/*.spec.ts"],

    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
);
