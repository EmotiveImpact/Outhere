// Shared lint rules for the web workspace (apps/app, apps/admin, packages/*).
// apps/mobile keeps Expo's own setup.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/build/**", "**/dist/**", "**/.react-router/**", "**/.turbo/**", "apps/mobile/**", "**/dist-ssr/**",
      // Generated from the database schema.
      "packages/core/src/supabase/database.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // "_name" marks a value left out on purpose, as in `const { id: _id, ...rest } = row`.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
);
