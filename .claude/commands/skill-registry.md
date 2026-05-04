# Skill Registry — MyFinance

Lista todos los commands y agentes disponibles en el proyecto.
Recibís: **$ARGUMENTS** (opcional: "list" para solo listar, "update" para regenerar).

## Commands disponibles — `.claude/commands/`

### SDD Workflow
| Command | Cuándo usarlo |
|---|---|
| `sdd-explore` | Investigar alternativas antes de proponer |
| `sdd-propose` | Proponer diseño — pausa para aprobación |
| `sdd-spec` | Escribir especificaciones BDD |
| `sdd-design` | Diseño técnico y ADRs |
| `sdd-tasks` | Mapa de tareas atómicas — pausa para aprobación(ionic-angular-architect) |
| `sdd-apply` | Implementar las tareas (con delegación de agentes) |
| `sdd-verify` | Validar implementación contra specs (qa-automation) |
| `sdd-archive` | Cerrar cambio y actualizar historial |
| `sdd-init` | Inicializar contexto SDD en una nueva sesión |

### Workflows de proyecto
| Command | Cuándo usarlo |
|---|---|
| `wf-feature-fullstack` | Nueva feature Sheets → service → page |
| `wf-code-review` | Auditoría de código antes de merge |
| `wf-database-migration` | Cambios de esquema en Google Sheets |
| `mock-data-seeder` | Generar datos realistas en Sheets para dev |

### Herramientas especializadas
| Command | Cuándo usarlo |
|---|---|
| `google-apps-script` | Lógica de servidor en Apps Script (.gs) |
| `sync-clasp` | Sincronizar código local ↔ Apps Script nube |
| `api-test-generator` | Generar tests de integración para servicios |
| `playwright-e2e` | Tests E2E con MCP Playwright |
| `angular-defer-optimizer` | Optimizar bundle inicial con `@defer` |
| `web-design-guidelines` | Design system y accesibilidad |
| `dockerize-app` | Dockerizar servicios si aplica |
| `skill-creator` | Crear nuevos commands/skills |
| `skill-registry` | Este archivo — listar herramientas disponibles |

## Agentes disponibles — `.claude/agents/`

| Agente | Responsabilidad |
|---|---|
| `develop-expert` | Implementa artefactos Angular/Ionic (page, component, effect, reducer, selector, model) |
| `ionic-angular-architect` | Diseño frontend — Ionic 8 + Angular 20 + NgRx v21 |
| `google-sheets-architect` | Esquema Sheets, modelos TypeScript, Apps Script |
| `qa-automation` | Tests unitarios Karma/Jasmine + E2E Playwright |
| `devops-cloud` | GitHub Actions, Capacitor build, CI/CD |

## Rules disponibles — `.claude/rules/`

| Rule | Qué define |
|---|---|
| `typescript.md` | Interfaces, strict mode, inject(), signals, constants, aliases |
| `angular.md` | Standalone, OnPush, input()/output(), toSignal(), lazy loading |
| `html.md` | @if/@for, bindings, event handlers, pipes |
| `ionic.md` | Componentes individuales, tabs, modals, toasts, alerts |
| `ngrx.md` | Actions, reducers puros, effects funcionales, selectors |
| `sheets-api.md` | SheetsApiService, ETag, cifrado PII, lógica de negocio |
| `tailwind.md` | Tailwind vs variables Ionic CSS, responsive, excepción SCSS |

## Reglas

- No modificar ningún archivo de command, agent ni rule — solo leer y reportar.
- Si falta un command esperado, indicarlo como "pendiente de crear".
