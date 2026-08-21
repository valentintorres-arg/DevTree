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
- [ ] Lazy imports (`React.lazy(() => import(...))`)
- [ ] HOCs (`withAuth(Component)`)
- [ ] Barrel exports / re-exports desde `index.ts`
- [ ] Componentes exportados como `default` sin nombre explícito

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
