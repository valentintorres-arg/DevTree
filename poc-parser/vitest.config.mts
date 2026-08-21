import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // El primer test que crea un Project de ts-morph paga el costo de
    // cargar el tsconfig.json de sample-project en frio; el default de
    // 5000ms da timeout intermitente segun carga del sistema/CI (visto
    // varias veces en sesiones anteriores, ver PROGRESS.txt).
    testTimeout: 20000,
  },
});
