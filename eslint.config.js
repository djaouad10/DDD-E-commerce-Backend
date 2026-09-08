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

    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["**/*.test.ts", "**/*.spec.ts", "src/tests/**"],

    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  {
    files: ["src/composition/utils/container.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
