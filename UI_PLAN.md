# UI_PLAN.md — POC: Visualizador del grafo de componentes (React Flow)

Continuación de `PLAN.md` (el parser). Ese POC ya produce
`poc-parser/output/graph.json`; este POC lo visualiza. Documento
separado a propósito — `PLAN.md` es específicamente del parser y
explícitamente pospuso esto ("Eso viene después, sobre esta base").

## Objetivo de este POC

Una app web standalone que lea un `graph.json` (con la forma
`{ components: [{ id, filePath, dependencies }] }` que ya produce
`poc-parser`) y lo renderice como un grafo interactivo con
[React Flow](https://reactflow.dev/): pan, zoom, nodos coloreados por
`exportType`, auto-layout (no hay que acomodar nodos a mano).

**Este POC NO incluye:**

- Backend/API: el `graph.json` se carga como archivo estático, sin
  servidor propio
- Edición del grafo que modifique código real (drag-and-drop que
  reordene imports, etc.)
- Generación de código con LLM
- Correr `poc-parser` desde la UI (por ahora se corre `pnpm run scan`
  aparte y se copia el `graph.json` resultante)

Eso viene después, sobre esta base.

## Stack

- Vite + React + TypeScript (sin SSR/routing: es una sola pantalla)
- [`@xyflow/react`](https://reactflow.dev/) (React Flow) para el grafo
- [`dagre`](https://github.com/dagrejs/dagre) para auto-layout (React
  Flow no posiciona nodos por si solo)
- pnpm — proyecto independiente (`ui/`), mismo patrón que
  `poc-parser`/`sample-project`: no se convierte el repo en un pnpm
  workspace

## Estructura de carpetas esperada

```
ui/
  src/
    App.tsx              # entry point: carga graph.json, arma nodes/edges
    graphToFlow.ts         # { components } -> nodes/edges de React Flow
    layout.ts              # aplica dagre para posicionar los nodes
    nodeStyles.ts          # color por exportType (mismo esquema que
                            # el artifact ya publicado)
  public/
    graph.json             # copia estatica del graph.json real, para
                            # servir en dev/build
  package.json
  vite.config.ts
```

## Pasos (ejecutar y revisar uno por uno, no todos juntos)

### Paso UI-0 — Setup del proyecto

- Scaffold Vite + React + TypeScript en `ui/`
- Instalar `@xyflow/react` y `dagre` (+ `@types/dagre`)
- Confirmar que `pnpm run dev` levanta una pantalla en blanco sin
  errores

### Paso UI-1 — Cargar y renderizar el grafo sin layout

- `graphToFlow.ts`: convierte `{ components }` a `{ nodes, edges }` de
  React Flow (posiciones provisorias, todas apiladas)
- Cargar `public/graph.json` (copiado a mano desde
  `poc-parser/output/graph.json` por ahora) y confirmar que aparecen
  los 9 nodos y las 8 aristas del fixture real

### Paso UI-2 — Auto-layout con dagre

- `layout.ts`: arma un grafo dagre (top-down, como el árbol que ya se
  dibujó a mano en el artifact publicado) y calcula posiciones
  reales para cada nodo antes de pasarlas a React Flow

### Paso UI-3 — Estilos por tipo de export

- Nodo custom de React Flow con badge de color por `exportType`
  (`functionDeclaration`, `arrowFunction`, `anonymousDefaultArrow`,
  `hocWrapped`), mismo esquema de colores que el artifact
- Controles built-in de React Flow: pan, zoom, minimap, fit-view al
  cargar

### Paso UI-4 — Verificación end-to-end

- Copiar el `graph.json` real de `poc-parser/output/` a `ui/public/`
- Correr `pnpm run dev`, abrir en un browser real y confirmar
  visualmente que el grafo coincide con el `graph.json` (mismo
  ejercicio de verificación que se usó para cada Paso del parser)

## Casos pendientes (no resolver ahora, solo anotar)

- [ ] Sincronizar `graph.json` automáticamente después de `pnpm run
scan` (por ahora es una copia manual)
- [ ] Servir el grafo de un proyecto target arbitrario, no solo
      `sample-project`
- [ ] Click en un nodo para ver su `filePath` completo / abrir el
      archivo (hoy el artifact de referencia lo hace con un
      `<title>` de SVG; la UI real necesita su propio mecanismo)

## Criterio de éxito del POC

Correr `pnpm run dev` en `ui/` y ver, en un browser real, el grafo de
`sample-project` (9 componentes) renderizado con pan/zoom y coloreado
por tipo de export, a partir del `graph.json` real que produce
`poc-parser`.
