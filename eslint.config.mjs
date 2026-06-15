import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import functional from "eslint-plugin-functional";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", ".next", "**/*.gen.ts", "**/*.gen.tsx", "lib/honcho/generated-types.ts"]),

  // 1. BASE CONFIG: Applied to all TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      functional.configs.lite,
      reactRefresh.configs.next,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "quotes": ["error", "double"],
      "semi": ["error", "always"],
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-module-boundary-types": "off",

      "no-restricted-syntax": [
        "error",
        {
          "selector": "TSInterfaceDeclaration",
          "message": "Use 'type' instead of 'interface' to maintain a functional-first codebase."
        },
        {
          "selector": "ClassDeclaration",
          "message": "Prefer functional components and pure functions over classes."
        }
      ],
    },
  },

  // 2. STRICT LOGIC: Applied to pure TypeScript utility/lib files
  {
    files: ["lib/**/*.ts"],
    rules: {
      "functional/no-return-void": [
        "error",
        {
          "allowNull": false,
          "allowUndefined": false,
          "ignoreInferredTypes": false
        }
      ],
      "functional/no-expression-statements": "error",
    }
  },

  // 3. REACT OVERRIDES: Relaxes rules for UI components
  {
    files: ["**/*.tsx"],
    rules: {
      "functional/no-return-void": "off",
      "functional/no-expression-statements": "off",
      "functional/no-throw-statements": "off",
      "functional/no-loop-statements": "off",
      "functional/no-let": "off",
    }
  },

  // 4. APP/API OVERRIDES: Relaxes rules for Next.js route handlers and server code
  {
    files: ["app/**/*.ts"],
    rules: {
      "functional/no-return-void": "off",
      "functional/no-expression-statements": "off",
      "functional/no-loop-statements": "off",
      "functional/no-let": "off",
      "functional/immutable-data": "off",
    }
  },

  // 5. TSX OVERRIDES: Additional relaxations for component patterns
  {
    files: ["**/*.tsx"],
    rules: {
      "functional/no-mixed-types": "off",
      "functional/prefer-immutable-types": "off",
      "functional/immutable-data": "off",
      "react-hooks/set-state-in-effect": "off",
    }
  },

  // 6. ANALYTICS OVERRIDE: Allows imperative patterns for memoization and data aggregation
  {
    files: ["lib/honcho/analytics.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/immutable-data": "off",
      "functional/no-loop-statements": "off",
      "functional/no-let": "off",
      "functional/no-return-void": "off",
    }
  },

  // 7. TEST OVERRIDES: Relaxes functional rules for test callbacks
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "functional/no-return-void": "off",
      "functional/no-expression-statements": "off",
      "functional/no-throw-statements": "off",
    }
  },
]);
