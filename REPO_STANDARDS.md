# REPO_STANDARDS.md — Estándares de repositorio

Este archivo define todo lo que el repo debe tener para verse y
funcionar como un proyecto profesional/production-ready. No todo se
implementa desde el día 1 — está organizado por fases según el estado
del proyecto. Claude Code debe consultar este archivo antes de asumir
que algo "ya está" o que "no hace falta todavía".

---

## Fase 0 — Desde el arranque del POC (bajo costo, se hace ya)

### Pre-commit hooks

- Husky + lint-staged
- Corre ESLint + Prettier sobre los archivos modificados antes de cada
  commit
- Si falla el lint, el commit se bloquea (no se permite `--no-verify`
  salvo excepción justificada y avisada)

### Linter y formatter

- ESLint configurado para TS/React
- Prettier con config compartida (`.prettierrc`)
- Ambos corren también en CI (no solo en pre-commit), como red de
  seguridad ante bypass local

### README mínimo viable

- Descripción corta del proyecto (qué es, qué problema resuelve)
- Stack técnico
- Pasos de instalación local (`pnpm install`, variables de entorno
  necesarias, comando para correr)
- Estado actual del proyecto (ej: "POC en desarrollo — parser de
  componentes")

### `.env.example`

- Se crea apenas exista la primera variable de entorno real
- Valores dummy, nunca reales
- `.env` real siempre en `.gitignore`

### Dependabot

- `.github/dependabot.yml` básico: chequeo semanal de dependencias npm
- Bajo mantenimiento, alto valor de "esto está vivo y seguro"

### Commits y branching

- Ya definido en `PLAN.md`: formato `[ADD] [FIX] [FEAT] [DOCS]
[REFACTOR] [TEST] [CHORE] [STYLE]`, una branch por feature, sin
  co-author

---

## Fase 1 — Cuando el proyecto tenga tests reales corriendo

### CI con GitHub Actions

- Workflow que se dispara en cada push y cada PR
- Jobs: install → lint → test (build si aplica)
- Falla el pipeline si cualquiera de esos pasos falla
- Node version fijada explícitamente (no `latest`), para reproducibilidad

### Branch protection en `main`

- Requiere que el CI pase antes de poder mergear
- Requiere al menos que la branch esté actualizada respecto a `main`
  antes de mergear
- Se configura desde GitHub UI/Settings, no es código — pero queda
  documentado acá que debe hacerse en este punto del proyecto

---

## Fase 2 — Cuando haya algo desplegable (deja de ser solo un script CLI)

### CD (Continuous Deployment)

- Definir plataforma según lo que se esté desplegando:
  - Frontend estático o app → Vercel o Netlify
  - Backend/API → Render o similar
- Deploy automático en cada merge a `main`
- Preview deployments en cada PR (si la plataforma lo soporta, ej.
  Vercel), para poder revisar cambios visualmente antes de mergear

### Docker

- `Dockerfile` para reproducir el entorno de forma containerizada
- `docker-compose.yml` si hay múltiples servicios (ej: backend + DB)
- Objetivo: que cualquiera clone el repo y levante el entorno completo
  con un solo comando

### Variables de entorno en producción

- Documentar en el README cómo se configuran en la plataforma de
  deploy (sin exponer valores reales)

---

## Fase 3 — Pulido para portfolio / cara pública del repo

Esto es principalmente cosmético/de presentación — tiene sentido cuando
el proyecto ya funciona y se quiere mostrar hacia afuera (reclutadores,
otros devs). No es prioridad funcional.

### README completo

- Screenshots o GIF corto mostrando el producto funcionando
- Link a demo en vivo (si aplica, post Fase 2)
- Diagrama de arquitectura simple (Mermaid.js embebido en el README, o
  imagen linkeada) — grafo de componentes, flujo de datos, o esquema de
  API según corresponda

### Historial de commits limpio

- Ya cubierto por la convención de Fase 0, pero en esta fase se revisa
  que no haya quedado ningún commit tipo "fix" o "wip" sin squashear si
  rompe la legibilidad del historial

### Issue templates

- Templates básicos de bug report y feature request en
  `.github/ISSUE_TEMPLATE/`
- Nota: esto es principalmente para simular actividad de proyecto
  open-source colaborativo. Solo tiene sentido si el repo se va a
  mostrar públicamente como parte de portfolio — no agrega valor
  funcional a un proyecto donde trabaja una sola persona con Claude Code

### License

- Agregar un archivo `LICENSE` (MIT es lo más común para portfolio)

---

## Checklist rápida (para ir tildando)

**Fase 0 — ahora:**

- [x] Husky + lint-staged
- [x] ESLint + Prettier
- [x] README mínimo
- [ ] `.env.example` (cuando aplique — todavía no hay variables de entorno)
- [x] Dependabot
- [x] Convención de commits/branching aplicada desde el primer commit

**Fase 1 — con tests reales:**

- [ ] GitHub Actions CI (lint + test)
- [ ] Branch protection en `main`

**Fase 2 — con algo desplegable:**

- [ ] CD configurado
- [ ] Dockerfile / docker-compose
- [ ] Env vars de producción documentadas

**Fase 3 — portfolio:**

- [ ] README con screenshots/GIF/demo
- [ ] Diagrama de arquitectura
- [ ] Issue templates
- [ ] LICENSE
