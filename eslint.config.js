// @ts-check
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");
const reactHooks = require("eslint-plugin-react-hooks");
const reactRefresh = require("eslint-plugin-react-refresh").default;

// Alcance: poc-parser/src (el parser) y ui/src (el visualizador React,
// ver UI_PLAN.md). sample-project es fixture sintetica para que el
// parser la analice (a proposito ejercita casos raros: HOCs, default
// exports anonimos, etc.) y no se lintea.
module.exports = tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "poc-parser/output/**"],
  },
  {
    files: ["poc-parser/src/**/*.ts"],
    extends: [tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["ui/src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended, reactHooks.configs.flat["recommended-latest"]],
    plugins: { "react-refresh": reactRefresh },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  eslintConfigPrettier,
);
