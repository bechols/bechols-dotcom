import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Global ignores and base JS config
  {
    ignores: ["dist", "node_modules"],
  },
  js.configs.recommended,

  // TypeScript files
  ...tseslint.config({
    files: ["**/*.ts", "**/*.tsx"],
    extends: tseslint.configs.recommendedTypeChecked,
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        console: "readonly",
        process: "readonly",
        __GIT_COMMIT_SHA__: "readonly",
        fetch: "readonly",
        Buffer: "readonly",
        window: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        document: "readonly",
        IntersectionObserver: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "no-debugger": "error",
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unused-expressions": "error",
      "no-unused-labels": "error",
      "no-unused-vars": "error",
      "no-var": "error",
      "prefer-const": "error",
      strict: "error",
    },
  }),

  // JavaScript files
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        URLSearchParams: "readonly",
        Date: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // Service worker
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Response: "readonly",
      },
    },
  },
);
