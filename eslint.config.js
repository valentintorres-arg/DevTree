// @ts-check
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");

// Alcance: solo poc-parser/src (el codigo mantenido del proyecto).
// sample-project es fixture sintetica para que el parser la analice
// (a proposito ejercita casos raros: HOCs, default exports anonimos,
// etc.) y no se lintea. Cuando exista codigo React real (visualizacion
// con React Flow, ver PLAN.md), agregar eslint-plugin-react /
// eslint-plugin-react-hooks en ese momento.
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
  eslintConfigPrettier,
);
