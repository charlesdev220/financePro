# SDD Apply — MyFinance

**`develop-expert`** ejecuta esta fase. Lee `spec.md`, `design.md` y `tasks.md`.
Implementa las tareas del cambio activo escribiendo código real.
Recibís: **$ARGUMENTS** (nombre del cambio, y opcionalmente qué tareas: "T-01, T-02").

## Pre-requisitos

Leer **obligatoriamente** antes de escribir una línea:
- `.sdd/changes/{change-name}/spec.md` → QUÉ debe hacer el código
- `.sdd/changes/{change-name}/tasks.md` → cuáles tareas ejecutar
- `.sdd/changes/{change-name}/design.md` → CÓMO estructurarlo (si existe)
- El código actual de los archivos que se van a modificar

## Delegación de agentes

| Tipo de tarea | Agente responsable |
|---|---|
| Componentes, pages, NgRx (actions/reducer/effects/selectors) | `develop-expert` |
| Cambios de esquema Sheets, modelos TypeScript en `models/` | `develop-expert` |
| Tests unitarios (Karma/Jasmine) o E2E (Playwright) | `qa-automation` |
| Builds, CI/CD, variables de entorno | `devops-cloud` |
| Tareas de 1 archivo o configuración simple | orchestrator inline |

El orchestrator asigna tareas a cada agente según la tabla. Cada agente lee las rules de su
capa en `.claude/rules/` antes de tocar código.

## Protocolo de implementación

1. Leer spec → entender criterios de aceptación.
2. Leer design → entender decisiones arquitectónicas (ADRs).
3. Leer código existente → no asumir, verificar el estado actual.
4. Implementar en orden de dependencias (modelos → effects → reducer → selectors → componente → template).
5. Al hacer un fix/cambio leer toda la logica de la funcion modificada para no dejarte logica inservible.
6. Marcar cada tarea completada: `- [ ]` → `- [x]` en `tasks.md`.
7. Actualizar `apply-progress.md` con lo implementado.
8. Actualizar `state.md` → fase: `apply`.

## Reglas de implementación — MyFinance

Consultar `.claude/rules/` antes de generar cualquier artefacto:

| Capa | Rule |
|---|---|
| TypeScript (interfaces, signals, constants) | `typescript.md` |
| Angular (standalone, OnPush, inject, lazy) | `angular.md` |
| HTML (control flow, bindings, event handlers) | `html.md` |
| Ionic (componentes, modals, toasts) | `ionic.md` |
| NgRx (actions, reducers funcionales, effects) | `ngrx.md` |
| Sheets API, cifrado PII, ETag | `sheets-api.md` |
| Tailwind CSS, estilos, SCSS | `tailwind.md` |

**No negociable:**
- Cero `TODO`, `FIXME`, `MOCK` — todo entregado debe ser funcional.
- `templateUrl` obligatorio — prohibido `template:` inline.
- Effects con `{ functional: true }` — sin clases `@Injectable`.
- `SPREADSHEET_ID` y tokens solo en `environment.ts`.
- Si el requerimiento contradice una rule → señalar el conflicto y escalar antes de proceder.

## Desviaciones del design

Si la implementación se desvía del `design.md`, documentar el motivo en `apply-progress.md`.
Nunca implementar en silencio algo diferente a lo diseñado.

## Formato de `apply-progress.md`

```markdown
## Implementation Progress — {change-name}

### Archivos Modificados
| Archivo | Acción | Qué se hizo |
|---------|--------|-------------|
| `src/app/store/transactions/transactions.effects.ts` | Modified | Convertido a effect funcional |

### Desviaciones del Design
Ninguna / o explicación de por qué se desvió.

### Estado
{N}/{total} tareas completas.
```
