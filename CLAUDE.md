# CLAUDE.md

Reglas de trabajo para este proyecto. Ver `PLAN.md` para el plan del POC
actual (parser de árbol de componentes React).

## Al arrancar cada sesión

- Leer `PROGRESS.txt` primero para tener contexto de continuidad antes de
  tocar código.

## Alcance

- No agregar funcionalidad fuera del paso del plan que se está ejecutando
  (ver "Casos pendientes" en `PLAN.md` — anotar ahí, no implementar).
- Si algo no está claro o hay una decisión de arquitectura no trivial,
  preguntar antes de asumir.

## Branching

- Una branch por feature/paso del plan (ej: `feature/scan-files`,
  `feature/detect-components`).

## Commits

- Commits chicos y frecuentes, uno por cada fix o cambio puntual — no
  acumular cambios grandes en un solo commit.
- Mensaje con prefijo obligatorio entre corchetes: `[ADD]`, `[FIX]`,
  `[FEAT]`, `[DOCS]`, `[REFACTOR]`, `[TEST]`, `[CHORE]`, `[STYLE]`.
- **Nunca** incluir `Co-Authored-By` ni ninguna línea de co-autoría en los
  commits. Verificación: si un commit aparece con `Co-Authored-By`, la
  config no está aplicando — revisar `~/.claude/settings.json`
  (`"includeCoAuthoredBy": false`) antes de seguir commiteando.

## Testing

- Cada feature/paso del plan incluye sus tests (unitarios como mínimo).
- No se da un paso por terminado sin tests que lo cubran.

## Documentación

- Documentar cada módulo con comentarios claros de qué hace y por qué.
- Mantener `README.md` actualizado con setup, comandos disponibles y
  estado general del proyecto.
- Decisiones de arquitectura no triviales van a `docs/decisions.md`.

## Memoria de avances

- Mantener `PROGRESS.txt` en la raíz: cada sesión agrega una entrada con
  fecha, qué se hizo, qué quedó pendiente y qué decisiones se tomaron.
