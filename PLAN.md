# PLAN.md — POC: Parser de árbol de componentes React

## Objetivo de este POC

Construir un script standalone en Node/TypeScript que analice un proyecto
React/TS y genere un JSON con el grafo de componentes y sus dependencias
(quién importa a quién). Este JSON es el insumo para la visualización
(React Flow) en una etapa posterior.

**Este POC NO incluye:**

- Chatbot / generación de código con LLM
- Drag and drop
- Conexión con backend
- UI de visualización

Eso viene después, sobre esta base. No agregar nada de eso ahora.

## Stack

- Node.js + TypeScript
- `ts-morph` como librería principal de análisis de AST
- Sin frameworks web todavía — es un script de CLI que corre sobre una
  carpeta y escribe un `.json` de salida

## Estructura de carpetas esperada

```
poc-parser/
  src/
    index.ts          # entry point, orquesta todo
    scanFiles.ts       # encuentra archivos .tsx/.ts del proyecto target
    detectComponents.ts # detecta qué exports son componentes React
    extractImports.ts  # saca imports locales de cada componente
    buildGraph.ts       # arma la estructura final {componentes, deps}
  output/
    graph.json
  package.json
  tsconfig.json
sample-project/         # proyecto React/TS de juguete para probar
  src/
    ...
```

## Pasos (ejecutar y revisar uno por uno, no todos juntos)

### Paso 0 — Setup del proyecto

- Inicializar proyecto Node + TypeScript (`npm init`, `tsc --init`)
- Instalar `ts-morph` como dependencia
- Confirmar que corre un "hello world" con ts-morph cargando un
  `tsconfig.json` de ejemplo
- Crear `CLAUDE.md` en la raíz con las reglas del proyecto: convención de
  commits, branching, prohibición de co-author, y recordatorio de leer
  `PROGRESS.txt` al arrancar cada sesión

### Paso 1 — Escaneo de archivos

- Función que recorra un proyecto target (`sample-project/`) y devuelva
  todos los `.tsx` y `.ts`, ignorando `node_modules`, `dist`, `build`
- Usar el `Project` de ts-morph apuntando al `tsconfig.json` del proyecto
  target, no globs manuales — así ts-morph resuelve paths e imports
  correctamente

### Paso 2 — Detección de componentes

- Para cada archivo, identificar qué exports son componentes React:
  - Function declarations que devuelven JSX
  - `const X = () => {...}` (arrow functions) que devuelven JSX
  - Ignorar hooks (`useX`), utils, types — no son componentes
- Devolver lista de `{ name, filePath, exportType }`

### Paso 3 — Extracción de imports locales

- Para cada componente detectado, leer sus import declarations
- Filtrar SOLO imports relativos o con alias del proyecto (no
  `node_modules`, no librerías externas)
- Resolver el import a qué componente/archivo del listado del Paso 2
  corresponde (si aplica)

### Paso 4 — Construcción del grafo

- Combinar todo en una estructura tipo:

```json
{
  "components": [
    {
      "id": "Button",
      "filePath": "src/components/Button.tsx",
      "dependencies": ["Icon"]
    }
  ]
}
```

- Escribir esto a `output/graph.json`

### Paso 5 — Validación manual

- Correr el script contra `sample-project/`
- Revisar el `graph.json` a mano: ¿están todos los componentes? ¿las
  dependencias son correctas? ¿faltó algún caso (lazy imports, HOCs,
  re-exports desde `index.ts`)?
- Anotar acá abajo, en "Casos pendientes", lo que no cubre esta v1

## Casos pendientes (no resolver ahora, solo anotar)

- [x] Lazy imports (`React.lazy(() => import(...))`) — ver Paso 9
- [x] HOCs (`withAuth(Component)`) — ver Paso 8
- [x] Barrel exports / re-exports desde `index.ts` — ver Paso 6
- [x] Componentes exportados como `default` sin nombre explícito — ver Paso 7
- [x] Bug descubierto en Paso 8 (`returnsJsx` con factory de HOC) — ver Paso 10

### Paso 6 — Barrel exports / re-exports desde `index.ts`

**Problema:** un componente importado a través de un barrel
(`import { Button } from './components'`, donde `components/index.ts`
hace `export { Button } from './Button'`) no se detecta hoy
correctamente:

- `detectComponents` usa `getExportedDeclarations()`, que ya resuelve
  la declaración real a través del re-export, pero le asigna el
  `filePath` del archivo barrel (bug) en lugar del archivo donde
  realmente vive el componente.
- `extractImports` resuelve el import solo hasta el archivo del
  `module specifier` (el barrel), sin seguir la cadena de alias hasta
  el archivo real — por eso no matchea contra el componente (cuyo
  `filePath` correcto es el archivo original).

**Cambios:**

- `detectComponents.ts`: usar `declaration.getSourceFile().getFilePath()`
  (no el `sourceFile` recibido como parámetro) como `filePath` de cada
  componente. Extraer el dedupe existente (por archivo+nombre) a una
  función `dedupeComponents` exportada, reutilizable también para
  dedupear entre archivos distintos (un componente re-exportado por un
  barrel aparece tanto al escanear su archivo original como al
  escanear el barrel).
- `extractImports.ts`: para cada import nombrado/default/namespace,
  resolver el símbolo real detrás del binding siguiendo la cadena de
  alias (`symbol.getAliasedSymbol()` en loop mientras `symbol.isAlias()`)
  vía el type checker de TypeScript (no regex, consistente con el resto
  del módulo), en vez de asumir que el archivo del `module specifier` es
  el archivo final.
- `index.ts`: dedupear `allComponents` globalmente (no solo por
  archivo) antes de construir el grafo, y resolver el `SourceFile` de
  cada componente por su `filePath` real (ya no por el archivo donde
  se lo "encontró").
- Fixture: agregar `sample-project/src/components/index.ts` (barrel
  que re-exporta Button/Header/Footer/Icon) y cambiar `App.tsx` para
  importar `Header`/`Footer` desde el barrel en lugar de la ruta
  directa — el grafo esperado (`App -> [Footer, Header]`, etc.) no
  cambia, así que sirve de test de regresión end-to-end sin tocar las
  expectativas existentes.
- Tests: casos borde en memoria para alias re-exportado
  (`export { default as Button } from './Button'`) y barrel-de-barrel
  (re-export transitivo de dos niveles), además del fixture de
  integración de arriba.

### Paso 7 — Componentes exportados como `default` sin nombre explícito

**Problema:** `export default function () {...}` y
`export default () => {...}` no tienen un identificador propio.
Verificado con `getExportedDeclarations()`: el primero devuelve un
`FunctionDeclaration` con `getName() === undefined`; el segundo
devuelve el nodo `ArrowFunction` directamente (no envuelto en una
`VariableDeclaration`, a diferencia de `const X = () => {...}`). Hoy
`detectComponents` descarta ambos casos: el primero por el chequeo
`if (!name || ...) continue`, el segundo porque no hay ninguna rama
que matchee un `ArrowFunction` suelto como declaración.

**Cambios:**

- `detectComponents.ts`:
  - Cuando el `FunctionDeclaration` no tiene nombre, derivar uno del
    archivo (`path.basename(filePath, ext)`, ej. `Modal.tsx` → `Modal`)
    en lugar de descartarlo.
  - Agregar una rama `Node.isArrowFunction(declaration)` para el caso
    `export default () => {...}` suelto, con el mismo fallback de
    nombre derivado del archivo.
  - El chequeo de hooks (`HOOK_NAME_PATTERN`) se aplica sobre el
    nombre ya resuelto (real o derivado), para no detectar como
    componente un default anónimo en un archivo tipo `useAlgo.ts`.
  - Nuevos valores de `ComponentExportType`:
    `"anonymousDefaultFunction"` y `"anonymousDefaultArrow"`, para
    distinguirlos en el log de `index.ts` (no se exponen en
    `graph.json`, que no incluye `exportType`).
- Limitación conocida y aceptada (documentar, no resolver): si dos
  archivos con default anónimo comparten el mismo nombre de archivo en
  carpetas distintas (ej. dos `index.tsx`), el nombre derivado
  colisiona en el grafo — el mismo riesgo ya existe hoy para
  componentes con nombre igual en archivos distintos, porque el `id`
  del grafo es el nombre, no la ruta.
- Tests: casos borde en memoria (`export default function () {...}`,
  `export default () => {...}`, ambos con JSX; un caso con nombre de
  archivo tipo hook para confirmar que se sigue ignorando) y al menos
  un componente con default anónimo agregado a `sample-project` para
  probarlo end-to-end en el `graph.json` real.

### Paso 8 — HOCs (`const X = withAuth(Component)`)

**Problema:** `const ProtectedPage = withAuth(Page);` no se detecta:
el initializer es un `CallExpression`, no una `ArrowFunction`, así que
la rama de `VariableDeclaration` lo descarta. A diferencia de los
casos anteriores, acá no hay ningún cuerpo de función que inspeccionar
con `returnsJsx` — `withAuth` casi siempre viene de otro módulo (a
veces ni siquiera del propio proyecto) y no sabemos qué devuelve.

Verificado con un script exploratorio (ts-morph en memoria) los 3
shapes relevantes:

- `export const X = withAuth(Page);` → `VariableDeclaration` con
  initializer `CallExpression`, `getArguments()` = `[Identifier
"Page"]`.
- `export default withAuth(Page);` (sin variable) →
  `getExportedDeclarations()` devuelve el `CallExpression` directo
  (mismo patrón que el default anónimo del Paso 7).
- HOCs currificados (`connect(mapState)(Component)`) → sigue siendo un
  `CallExpression` cuyo callee es _otro_ `CallExpression`
  (`connect(mapState)`), pero `getArguments()` del call externo sigue
  dando `[Identifier "Component"]` — no hace falta lógica especial
  para curry.

**Heurística elegida (sin verificación de JSX, es la única señal
estática disponible):** tratar `const X = <CallExpression>` como
componente cuando:

1. El nombre (`X`, o el derivado del archivo para `export default
<CallExpression>` sin nombre, reutilizando `deriveNameFromFilePath`
   del Paso 7) es PascalCase (empieza con mayúscula) y no matchea
   `HOOK_NAME_PATTERN`.
2. El `CallExpression` tiene **al menos un argumento que es un
   `Identifier` con nombre PascalCase** — proxy de "envuelve a un
   componente". Esto excluye deliberadamente falsos positivos obvios
   como `const Logger = createLogger();` (sin argumentos) mientras
   sigue aceptando `withAuth(Page)`, `React.memo(Component)` y
   `connect(mapState)(Component)`.

**Limitación conocida y aceptada (documentar, no resolver):** esta
heurística puede dar falsos positivos si el argumento PascalCase no es
en realidad un componente (ej. `const Config = mergeConfigs(DefaultConfig)`)
y falsos negativos si el HOC no recibe el componente como argumento
directo. No hay forma de verificarlo estáticamente sin resolver la
implementación real de la función wrapper (a menudo externa al
proyecto). No hace falta tocar `extractImports.ts`: si el componente
envuelto (`Page`) está importado localmente, ya se detecta como
dependencia por el mecanismo existente (cualquier componente cuyo
archivo esté entre los imports locales cuenta como dependencia,
independientemente de si el heurístico de HOC lo detecto por nombre o
no).

**Cambios:**

- `detectComponents.ts`: nueva rama en `VariableDeclaration` para
  initializer `CallExpression` (heurística de arriba), y nueva rama
  para `Node.isCallExpression(declaration)` (el caso `export default
withAuth(Page)` sin nombre propio). Nuevo `ComponentExportType`:
  `"hocWrapped"`.
- Fixture: agregar un HOC (`withAuth`) y un componente envuelto en
  `sample-project`, consumido desde algún componente existente, para
  probarlo end-to-end en el `graph.json` real.
- Tests: casos borde en memoria (HOC simple, HOC currificado, `export
default` sin nombre, y el falso-positivo-evitado de "sin
  argumentos").

### Paso 9 — Lazy imports (`React.lazy(() => import(...))`)

**Problema:** `const LazySidebar = React.lazy(() => import('./Sidebar'));`
usa un `import()` dinámico, que es un `CallExpression` (no un
`ImportDeclaration`) — `getImportDeclarations()` no lo ve, así que
`extractImports` no cuenta `Sidebar` como dependencia del archivo que
lo usa.

Verificado con un script exploratorio: un `import('./Foo')` dinámico
es un `CallExpression` cuyo `getExpression()` tiene
`SyntaxKind.ImportKeyword`; su primer argumento (el string literal del
specifier) resuelve, vía `arg.getSymbol()`, a un símbolo cuya
declaración **es directamente el `SourceFile`** importado — igual de
confiable que `getModuleSpecifierSourceFile()` para imports estáticos,
sin resolver rutas a mano.

**Cambios:**

- `extractImports.ts`: nueva función `getDynamicallyImportedFiles`
  que busca todos los `CallExpression` del archivo con
  `expression.getKind() === SyntaxKind.ImportKeyword`, resuelve el
  primer argumento a su `SourceFile` vía el símbolo, y descarta
  `node_modules` (mismo filtro que los imports estáticos). Su
  resultado se combina con `getLocalImportedFiles` antes de armar
  `importedFilePaths`.
- No hace falta tocar `detectComponents.ts`: `const LazySidebar =
React.lazy(...)` no matchea ninguna rama existente (su initializer
  es un `CallExpression` cuyo único argumento es una `ArrowFunction`,
  no un `Identifier` PascalCase, así que tampoco dispara la heurística
  de HOC del Paso 8) — y no hace falta que la dispare: el componente
  real (`Sidebar`) ya existe como su propia entrada detectada en su
  archivo; lo único que faltaba era la arista de dependencia hacia él.
- Fixture: agregar un componente nuevo en `sample-project` consumido
  únicamente vía `React.lazy(() => import(...))` desde otro
  componente, para probarlo end-to-end en el `graph.json` real.
- Tests: casos borde en memoria (lazy import simple, y que un
  `import()` dinámico a un archivo sin componentes no aporte
  dependencias, igual que un import estático).

### Paso 10 — Fix: `returnsJsx` falso positivo con factory de HOC

**Problema** (encontrado en Paso 8): `expressionHasJsx` busca JSX en
_todos_ los descendientes de la expresión de un `return`, sin límite.
Cuando esa expresión es directamente **otra función**
(`return function Wrapped(props) { return <Component {...props}/>; };`,
el patrón típico de una factory de HOC), el chequeo encuentra el JSX
que hay _dentro_ de esa función anidada y concluye erróneamente que la
función exterior (`withAuth`) devuelve JSX — cuando en realidad lo que
devuelve es una función, no JSX.

**Por qué el fix originalmente propuesto (Paso 8) era incorrecto:**
la idea inicial era "que la búsqueda de JSX respete el límite de no
bajar a ninguna función anidada en todos los casos". Eso rompe un
patrón real y ya usado indirectamente: `return items.map(item =>
<li key={item.id}>{item.name}</li>);` (retornar un array de JSX sin
wrapper) — ahí el callback de `.map` **sí** debe inspeccionarse,
porque el valor devuelto (el array) contiene JSX generado por ese
callback; no es un caso de "devuelvo otra función como valor".

**Fix correcto, más angosto:** el valor de un `return` (o el cuerpo de
una arrow con retorno implícito) sólo se descarta como "no es JSX" si
la expresión devuelta **es ella misma, directamente**, un
`ArrowFunction`/`FunctionExpression` (`NESTED_FUNCTION_KINDS`) — ese
caso puntual (devolver una función) nunca cuenta como JSX,
independientemente de lo que esa función interna devuelva. Para
cualquier otro tipo de expresión (JSX directo, `ParenthesizedExpression`,
`CallExpression` como `.map(...)`, etc.) se seguye usando la búsqueda
existente sin límite (`expressionHasJsx`), sin cambios.

**Cambios:**

- `detectComponents.ts`: nueva función `isJsxReturnValue(expr)` =
  `NESTED_FUNCTION_KINDS.has(expr.getKind()) ? false :
expressionHasJsx(expr)`, usada en ambos puntos donde `returnsJsx`
  invocaba `expressionHasJsx` directamente (el cuerpo-expresión de una
  arrow, y la expresión de cada `return` en un cuerpo en bloque).
- Fixture: `ProtectedPage.tsx` deja de importar `withAuth` de un
  paquete externo ficticio (workaround del Paso 8) y pasa a usar un
  `withAuth` real y local (`hocs/withAuth.tsx`, factory clásica de
  HOC) — valida que el fix realmente evita el falso positivo end-to-end
  contra el `graph.json` real (mismo grafo que antes, sin que
  `withAuth` aparezca como componente).
- Tests: caso borde de regresión para el patrón `.map()` (confirmando
  que sigue detectándose), y caso borde para la factory de HOC
  (confirmando que ya NO se detecta como componente).

## Criterio de éxito del POC

Correr un solo comando (`npm run scan` o similar) sobre `sample-project/`
y obtener un `graph.json` válido que represente correctamente los
componentes y sus dependencias directas, sin intervención manual.

---

## Metodología de trabajo (aplica a todo el proyecto, no solo este POC)

### Documentación

- Documentar todo: cada módulo con comentarios claros de qué hace y por qué
  (no solo qué hace)
- Mantener un `README.md` actualizado con setup, comandos disponibles y
  estado general del proyecto
- Cualquier decisión de arquitectura no trivial (ej: por qué ts-morph y no
  Babel) queda registrada en un `docs/decisions.md` o similar

### Memoria de avances

- Mantener un archivo `PROGRESS.txt` en la raíz del proyecto
- Cada sesión de trabajo agrega una entrada con fecha, qué se hizo, qué
  quedó pendiente y qué decisiones se tomaron
- Este archivo es lo primero que Claude Code debe leer al arrancar una
  sesión nueva, para tener contexto de continuidad

### Testing

- Cada feature/paso del plan debe incluir sus tests (unitarios como
  mínimo; agregar integración donde tenga sentido, ej: correr el parser
  completo contra `sample-project/` y validar el `graph.json` de salida)
- No se da un paso por terminado sin tests que lo cubran

### CI/CD y DevOps

- Configurar pipeline de CI (GitHub Actions) que corra lint + tests en
  cada push y en cada PR
- Definir estructura básica de CD cuando el proyecto llegue a tener algo
  desplegable (no aplica todavía al POC del parser, pero dejar el pipeline
  preparado para escalar)

### Branching y commits

- Una branch por feature/paso del plan (ej: `feature/scan-files`,
  `feature/detect-components`)
- Commits chicos y frecuentes, uno por cada fix o cambio puntual — no
  acumular cambios grandes en un solo commit
- Formato de mensaje de commit obligatorio, con prefijo entre corchetes:
  `[ADD]`, `[FIX]`, `[FEAT]`, `[DOCS]`, `[REFACTOR]`, `[TEST]`, `[CHORE]`,
  `[STYLE]`
- **Nunca** incluir co-author en los commits/push (sin línea
  `Co-Authored-By`). Configuración de esto:
  - Global: `~/.claude/settings.json` con `"includeCoAuthoredBy": false`
  - Documentado también en `CLAUDE.md` del proyecto (ver Paso 0) como
    regla explícita, para que quede registrado incluso si la config
    global falla o se pierde
  - Verificación: si algún commit aparece con `Co-Authored-By`, es señal
    de que la config no está aplicando — revisar `~/.claude/settings.json`
    antes de seguir commiteando
- Si en algún punto no está claro cómo proceder o hay una decisión que
  requiere mi input, Claude Code debe preguntarme antes de avanzar, no
  asumir
