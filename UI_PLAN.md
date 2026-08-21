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
- Controles built-in de React Flow: pan, zoom, fit-view al cargar.
  **Actualizado:** el `<MiniMap>` built-in solo dibuja un rectángulo
  por nodo, nunca las conexiones (limitación del componente, no un
  prop que faltaba) — el usuario lo señaló directamente al verlo.
  Reemplazado por `TreeMiniMap.tsx`, un SVG propio que dibuja tanto
  nodos como aristas escalados al mismo layout de dagre (ver Fase 2)

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

---

## Fase 2 — Edición real: agregar componentes y conectarlos

Pedido explícito del usuario tras ver el viewer: poder agregar un
componente nuevo y conectarlo desde la UI. **Esto revierte una
decisión explícita de este mismo documento** ("Este POC NO incluye:
Backend/API... Edición del grafo que modifique código real") — un
browser no puede escribir al filesystem por su cuenta, así que hace
falta un servidor. Se documenta el cambio acá en vez de editar la
sección de arriba, para que quede registro de por qué se agregó.

### Objetivo

Que agregar un nodo en el canvas cree un archivo de componente real
en el proyecto target, y que conectar dos nodos (arrastrar de un
handle a otro) inserte un import real en el archivo del componente
origen — de forma que, al volver a correr `pnpm run scan` en
`poc-parser`, el componente nuevo y su dependencia aparezcan en el
`graph.json` real (el mismo criterio de verificación que se usó en
todo Paso anterior: no basta con que se vea bien en la UI, tiene que
sobrevivir un re-scan real).

### Por qué un plugin de Vite y no un servidor aparte

En vez de correr un backend en un proceso separado, un plugin de Vite
(`configureServer`) agrega un par de endpoints sobre el mismo proceso
de `pnpm run dev` — un solo comando, consistente con como ya funciona
el viewer. Esto **solo corre en dev** (`vite build` no incluye
middlewares de plugins), lo cual es aceptable: es una herramienta
interna para un solo desarrollador, no algo que se despliega (ver
REPO_STANDARDS.md Fase 2, sigue sin aplicar).

### Alcance

- **Crear componente:** UI para pedir un nombre -> escribe
  `<targetRoot>/src/components/<Name>.tsx` con un stub de function
  component (`export function Name() { return <div>Name</div>; }`) —
  una forma que `detectComponents` ya reconoce, para que el
  round-trip con `pnpm run scan` funcione sin casos especiales.
- **Conectar componentes:** arrastrar de un handle a otro
  (`onConnect` de React Flow) -> inserta
  `import { B } from './ruta/relativa'` en el archivo de A, vía
  ts-morph (no regex, mismo criterio que el resto del proyecto),
  resolviendo la ruta relativa real entre los dos `filePath`.
- El grafo en pantalla se actualiza al toque (nodo/edge aparecen
  apenas el server confirma haber escrito), pero la fuente de verdad
  sigue siendo el filesystem + un re-scan de `poc-parser`.
- Target project configurable via una constante/env var del plugin de
  Vite; por default sigue siendo `sample-project`.

### Fuera de alcance (anotar, no ahora)

- [ ] Generar el uso real en JSX (`<B />` dentro del render de A) —
      por ahora solo el import, no dónde se usa
- [ ] Mover o renombrar componentes desde la UI (borrar una conexión sí
      quedó — ver Paso UI-10)
- [ ] Deshacer (undo) de una escritura ya hecha en disco
- [ ] Cualquier autenticación del endpoint (corre 100% local, en dev)
- [ ] **Tensión sin resolver:** `sample-project` es a la vez la fixture
      curada de los tests de `poc-parser` y el target real y mutable
      de esta Fase 2 — usarla desde la UI (agregar/conectar) rompe los
      tests golden de `poc-parser`, que hardcodean su forma original.
      Pendiente: un target de UI separado de la fixture de tests, o
      alguna otra forma de que no compitan.

### Pasos

#### Paso UI-5 — Endpoint para crear un componente ✅

- Plugin de Vite con `configureServer`: `POST /api/components` con
  `{ name: string }`, escribe el archivo stub bajo
  `<targetRoot>/src/components/`
- Devuelve `{ id, filePath }` (mismo shape que un `GraphComponent`,
  sin `dependencies` todavía) para que el frontend pueda agregar el
  nodo sin esperar un re-scan

#### Paso UI-6 — UI para crear un nodo ✅

- Affordance en el canvas (ej. botón "+ Nuevo componente" o
  doble-click en área vacía) que pide el nombre, llama al endpoint, y
  agrega el nodo al estado de React Flow en la posición donde se pidió

#### Paso UI-7 — Endpoint para conectar dos componentes ✅

- `POST /api/connections` con `{ fromId, toId }`: usa ts-morph para
  abrir el archivo de `fromId`, calcular la ruta relativa hacia
  `toId.filePath`, y agregar un `ImportDeclaration` si todavía no
  existe (idempotente — conectar dos veces no duplica el import)

#### Paso UI-8 — UI para conectar ✅

- `onConnect` de React Flow llama al endpoint; si responde ok, agrega
  la edge visualmente. Si falla (ej. ya existe, o error de escritura),
  mostrar el error en vez de agregar la edge silenciosamente

#### Paso UI-9 — Verificación end-to-end ✅

- Desde la UI real: crear un componente nuevo, conectarlo a uno
  existente
- Correr `pnpm run scan` de nuevo en `poc-parser` (proceso aparte,
  sin reiniciar el viewer) y confirmar que el `graph.json` real
  incluye el componente nuevo y la dependencia — el mismo criterio de
  éxito que cualquier Paso anterior, pero disparado desde la UI en vez
  de escrito a mano
- Verificado dos veces: con `curl` directo a ambos endpoints, y por el
  usuario probando con su propio mouse (creó `Widget.tsx` y conectó
  `Page -> Icon -> Widget` de verdad)

#### Paso UI-10 — Eliminar una conexión (agregado, no estaba en el plan original)

- Pedido explícito del usuario tras ver que no había forma de sacar
  una conexión ya creada
- `DELETE /api/connections` (mismo endpoint, otro método): saca el
  named import; si el `ImportDeclaration` se queda sin ninguno (y sin
  default/namespace import), lo borra entero — no deja un
  `import "./ruta";` huérfano
- UI: click en una edge la selecciona (`onSelectionChange`, no solo la
  tecla Delete/Backspace — más robusto que depender del foco de
  teclado tras un click) y aparece un botón "Eliminar" explícito
- De paso: handles de conexión agrandados (10px, eran 6px) e
  `interactionWidth: 32` en las edges — eran demasiado chicos para
  acertar con precisión con el mouse

### Criterio de éxito de esta fase

Desde el browser: crear un componente, conectarlo a `Page` (o
cualquier otro), y sin tocar el filesystem a mano, ver que
`sample-project/src/components/` tiene el archivo nuevo con el import
agregado — y que un `pnpm run scan` posterior en `poc-parser` lo
confirma en el `graph.json`.
