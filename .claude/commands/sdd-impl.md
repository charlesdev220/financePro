# SDD Impl — Paso 4

Implementa las tareas del `3-task.md` y escribe/ejecuta los tests del spec inline.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Agentes responsables

| Tipo de tarea | Agente | Rules obligatorias |
|---|---|---|
| Models, NgRx (actions/reducer/effects/selectors) | `develop-expert` | `typescript.md` · `ngrx.md` |
| Components, Pages, Templates | `develop-expert` | `angular.md` · `html.md` · `ionic.md` · `tailwind.md` · `ux-ui.md` |
| Sheets API, cifrado PII | `develop-expert` | `sheets-api.md` |
| Tests unitarios (Karma/Jasmine) | `qa-automation` | `typescript.md` · `angular.md` · `ngrx.md` |
| Tests E2E (Playwright) | `playwright-inspector` | `ux-ui.md` · `ionic.md` |
| Build, CI/CD, secrets | `devops-cloud` | `CLAUDE.md` sección Stack |

## Protocolo

1. Leer `1-init.md` → contexto, archivos afectados y lecciones previas.
2. Leer `2-spec.md` → criterios de aceptación por flujo.
3. Leer `3-task.md` → qué implementar, en qué orden.
4. Leer el **código actual** de cada archivo afectado — nunca asumir estado.
5. Consultar la rule de capa en `.claude/rules/` antes de cada archivo.
6. Implementar en orden de dependencias dentro de cada flujo.
7. Marcar cada tarea al completarla: `- [ ]` → `- [x]` en `3-task.md`.
8. Si la implementación se desvía de `1-init.md` → documentar en `4-impl-log.md`.

## Estructura de `4-impl-log.md`

```markdown
# Impl Log: {change-name}

## Archivos modificados
| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/...` | Added/Modified/Deleted | {Una línea} |

## Desviaciones de 1-init.md
{Ninguna / motivo concreto de cada desviación}

## Decisiones tomadas durante impl
{Cualquier decisión técnica no capturada en 1-init.md}
```

## Reglas

- Un agente no escribe código sin haber leído la rule de su capa.
- Si un requerimiento contradice una rule → escalar al orchestrator antes de proceder.
- Cero `TODO`, `FIXME`, `MOCK` — todo entregado debe ser funcional.
- `templateUrl` obligatorio — prohibido `template:` inline.
- Los tests se escriben en la misma iteración que el código que verifican, no al final.
- **PARAR** al terminar. Mostrar resumen `[x]` completadas vs `[ ]` pendientes. No avanzar sin aprobación.
