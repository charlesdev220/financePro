# SDD Verify — Paso 5

Verifica la implementación, cierra los tres depósitos de memoria y archiva.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Agentes responsables

- **`qa-automation`** — compliance arquitectónico + tests unitarios Karma/Jasmine + completeness.
- **`playwright-inspector`** — tests E2E Playwright + inspección visual en browser real.

## Pre-requisitos

Leer obligatoriamente:
- `.sdd/changes/{change-name}/1-init.md`
- `.sdd/changes/{change-name}/2-spec.md`
- `.sdd/changes/{change-name}/3-task.md`
- `.sdd/changes/{change-name}/4-impl-log.md`
- El código implementado en los archivos de `4-impl-log.md`

## A. Completeness

- Todas las tareas en `3-task.md` marcadas `[x]`.
- El propósito declarado en `1-init.md` puede declararse como cumplido.

## B. Spec compliance

- Para cada UC en `2-spec.md`, existe evidencia en el código **y** un test que lo verifica.
- UCs de error path tienen su correspondiente manejo en effects/componentes.

## C. Architecture compliance

| Regla | Verificación |
|-------|-------------|
| `standalone: true` | Todos los componentes nuevos |
| `OnPush` | `ChangeDetectionStrategy.OnPush` en todos los componentes |
| Effects funcionales | `{ functional: true }`, sin clases `@Injectable` |
| `input()` / `output()` modernos | Sin `@Input()` / `@Output()` legacy |
| No inline templates | Ningún `.ts` contiene `template:` |
| `inject()` | Sin constructor injection |
| Control flow moderno | `@if` / `@for` — sin `*ngIf` / `*ngFor` |
| JSDoc en `toSignal()` / `computed()` | Línea JSDoc obligatoria |
| Constantes tipadas | Sin string literals de comparación |
| Cero TODO/FIXME | Grep en archivos modificados |
| SheetsApiService solo en Effects | Ningún componente llama directo |
| SPREADSHEET_ID en env | No hardcodeado |

## D. Actualizar `HISTORIAL_APRENDIZAJE.md`

Solo si el veredicto es PASS o PASS WITH WARNINGS. Formato grep-friendly:

```markdown
### [APREND-{NNN}] {Título breve}
**Contexto:** `{archivo}` · {clase/servicio} · {método si aplica}
**Patrón:** {bug | decision | warning | performance}
**Síntoma:** {qué se observó}
**Causa:** {por qué ocurrió}
**Fix:** {qué lo resolvió}
**Promovido a rule:** `{archivo:línea}` / No
```

## E. Actualizar `HISTORIAL_IMPLEMENTACION.md`

Solo si el veredicto es PASS o PASS WITH WARNINGS:

```markdown
### Qué hemos completado hasta ahora ({Título}):
*Fase actual:* Fase X: ...
*Estado actual:* Completado
- ✔️ **{Nombre}:** {Descripción técnica en 1 línea}
*Archivos modificados:* `{archivo1}`, `{archivo2}`
*Deuda técnica documentada:* {...}
*Próximos pasos:* {...}
```

## F. Detección de patrones → promoción a rules

Cuando verify encuentra un WARNING o CRITICAL, preguntar:  
**¿Este patrón ya apareció en `HISTORIAL_APRENDIZAJE.md` antes?**

```
Si el mismo patrón aparece 2+ veces en el historial:
→ Promover a .claude/rules/{capa}.md como regla explícita
→ Actualizar la entrada del historial: "Promovido a rule: sheets-api.md línea XX"
→ Registrar en 5-verify-report.md bajo "Reglas promovidas"
```

## G. Actualizar `project-map.json`

Siempre, si el veredicto es PASS o PASS WITH WARNINGS.  
Solo se actualizan los nodos tocados por el cambio (listados en `4-impl-log.md`):

```bash
npx tsx frontend/tools/generate-project-map.ts --files archivo1.ts,archivo2.ts
```

Si el script falla → el archive no está completo.

## H. Archive

Mover `.sdd/changes/{change-name}/` a `.sdd/changes/archive/{change-name}/`.  
Actualizar `state.md` → `Estado: Completado`.

## Estructura de `5-verify-report.md`

```markdown
# Verify Report: {change-name}

## Completeness
| Métrica | Valor |
|---------|-------|
| Tareas totales | {N} |
| Completadas [x] | {N} |
| Pendientes [ ] | {N} |

## Spec Compliance
| UC | Título | Evidencia | Test | Estado |
|----|--------|-----------|------|--------|
| UC-01 | {título} | `archivo:línea` | `spec:línea` | ✅ |
| UC-02 | {título} | — | — | ❌ |

## Architecture Compliance
| Regla | Estado | Notas |
|-------|--------|-------|
| Standalone | ✅/❌ | |
| OnPush | ✅/❌ | |
| Effects funcionales | ✅/❌ | |
| input()/output() modernos | ✅/❌ | |
| No inline templates | ✅/❌ | |
| inject() | ✅/❌ | |
| Control flow moderno | ✅/❌ | |
| JSDoc en toSignal/computed | ✅/❌ | |
| Constantes tipadas | ✅/❌ | |
| Cero TODO/FIXME | ✅/❌ | |
| SheetsApiService solo en Effects | ✅/❌ | |
| SPREADSHEET_ID en env | ✅/❌ | |

## Issues

**CRITICAL** (bloquean archive):
Ninguno / lista

**WARNING** (recomendado corregir):
Ninguno / lista

## Reglas promovidas (F)
| Patrón | Historial | Rule actualizada |
|--------|-----------|-----------------|
| {descripción} | APREND-{NNN} | `{archivo}.md:{línea}` |

## Veredicto
{PASS / PASS WITH WARNINGS / FAIL}
```

## Reglas

- Issues CRITICAL bloquean el archive.
- No corregir issues en esta fase — solo reportar. El usuario decide.
- Los historiales se actualizan **solo** si el veredicto es PASS o PASS WITH WARNINGS.
- `project-map.json` se regenera siempre antes del archive.
- Archive es la última acción de este paso — no un paso separado.
