# Skill Registry

Generá o actualizá el registro de skills disponibles en el proyecto.  
Recibís: **$ARGUMENTS** (opcional: acción específica "update" o "list").

## Cuándo ejecutar

- Después de instalar o crear nuevos skills/commands.
- Cuando el orchestrator necesita saber qué skills están disponibles.
- Al iniciar una nueva sesión de trabajo compleja.

## Qué hacer

### 1. Escanear `.claude/commands/`

Listar todos los archivos `.md` y extraer su propósito:

| Command | Propósito |
|---|---|
| `sdd-explore` | Investigar alternativas antes de proponer |
| `sdd-propose` | Proponer diseño (pausa para aprobación) |
| `sdd-spec` | Escribir especificaciones BDD |
| `sdd-design` | Diseño técnico y ADRs |
| `sdd-tasks` | Mapa de tareas atómicas (pausa para aprobación) |
| `sdd-apply` | Implementar tareas |
| `sdd-verify` | Validar implementación contra specs |
| `sdd-archive` | Cerrar cambio, actualizar historial |
| `sdd-init` | Inicializar contexto SDD |
| `generate-liquibase` | Generar changelog Liquibase tras cambiar @Entity |
| `generate-api-client` | Regenerar cliente TypeScript desde openapi.yaml |
| `mock-data-seeder` | Generar datos realistas para dev |
| `angular-core` | Componentes, signals, inject |
| `angular-forms` | Reactive forms con validación |
| `angular-performance` | @defer, NgOptimizedImage, lazy loading |
| `angular-defer-optimizer` | Optimizar bundle inicial con @defer |
| `web-design-guidelines` | Design system y accesibilidad |
| `api-test-generator` | Tests de integración desde OpenAPI |
| `java-springboot` | Patterns Spring Boot |
| `java-junit` | Tests JUnit 5 + Mockito |
| `java-refactoring` | Refactoring extract method |
| `spring-boot-architecture` | Arquitectura hexagonal Spring |
| `spring-boot-core` | Manejo errores, contract-first |
| `spring-boot-database` | JPA performance, PostGIS |
| `dockerize-app` | Dockerizar servicios |
| `wf-feature-fullstack` | Feature DB → Backend → Frontend |
| `wf-code-review` | Auditoría antes de merge |
| `wf-database-migration` | Cambios de esquema |
| `skill-creator` | Crear nuevos skills |
| `playwright-e2e` | Testing E2E con MCP Playwright (flujos, auth, mapas, favoritos) |

### 2. Escanear `.claude/agents/`

| Agente | Propósito |
|---|---|
| `orchestrator` | Lead developer, coordina todo |
| `sdd-orchestrator` | Motor SDD, manejo de fases |
| `spring-architect` | Backend Java 21 + Hexagonal |
| `angular-architect` | Frontend Angular 17+ Standalone |
| `qa-automation` | JUnit, Mockito, Cypress |
| `devops-cloud` | Docker, CI/CD, infraestructura |
| `persona-gentleman` | Personalidad y tono |
| `output-style-gentleman` | Estilo de respuesta |

### 3. Reportar

Devolver el registro completo como tabla y confirmar cuántos skills y agentes están disponibles.

## Reglas

- No modificar ningún archivo de skill ni agent — solo leer y reportar.
- Si faltan skills esperados, indicarlos como "pendientes de crear".