# SDD Verify — MyFinance

Valida que la implementación cumple con las specs.
Recibís: **$ARGUMENTS** (nombre del cambio).

## Agente responsable

**`qa-automation`** ejecuta esta fase. Lee `spec.md` y `tasks.md`, revisa el código implementado,
corre los tests existentes, que la funcionalidad anterior se mantiene y emite el `verify-report.md`.
**Verifica si lo especificado en `explore.md` se cumple**

## Pre-requisitos

Leer **obligatoriamente**:
- `.sdd/changes/{change-name}/spec.md`
- `.sdd/changes/{change-name}/tasks.md`
- El código implementado en los archivos afectados

## Qué verificar

1. **Completeness:** Todas las tareas en `tasks.md` marcadas `[x]`.
2. **Correctness:** Para cada requirement en `spec.md`, buscar evidencia en el código.
3. **Testing:** Verificar que existen tests para los scenarios críticos del spec.
4. **Architecture compliance:** El código cumple las reglas de `.claude/rules/`.
5. Guardar resultado en `.sdd/changes/{change-name}/verify-report.md`.
6. Actualizar `state.md` → fase: `verify`.

## Compliance checklist — MyFinance

| Regla | Qué verificar |
|---|---|
| Standalone components | `standalone: true` en todos los componentes nuevos |
| OnPush | `ChangeDetectionStrategy.OnPush` en todos los componentes |
| Functional effects | Effects exportan `const`, no clases `@Injectable` |
| Signal-based inputs | `input()` / `output()` — sin `@Input()` / `@Output()` legacy |
| No inline templates | Ningún `.ts` contiene `template:` — solo `templateUrl:` |
| inject() | Sin constructor injection |
| Control flow moderno | `@if` / `@for` — sin `*ngIf` / `*ngFor` |
| JSDoc en toSignal/computed | Cada `toSignal()` y `computed()` tiene su línea JSDoc |
| Constantes tipadas | Sin string literals de comparación (`'income'`, `'expense'`) |
| Cero TODO/FIXME | Grep confirma ausencia en archivos modificados |
| SheetsApiService solo en Effects | Ningún componente ni service llama directamente |
| SPREADSHEET_ID en env | No hardcodeado en ningún archivo de código |

## Formato de `verify-report.md`

```markdown
## Verification Report: {change-name}

### Completeness
| Métrica | Valor |
|---------|-------|
| Total tareas | {N} |
| Completas [x] | {N} |
| Pendientes [ ] | {N} |

### Spec Compliance Matrix
| Requirement | Scenario | Evidencia (archivo:línea) | Estado |
|-------------|----------|--------------------------|--------|
| REQ-01 | {scenario} | `src/app/store/transactions/transactions.effects.ts:12` | ✅ COMPLIANT |
| REQ-02 | {scenario} | (no se encontró) | ❌ UNTESTED |

### Architecture Compliance
| Regla | Estado | Notas |
|-------|--------|-------|
| Standalone components | ✅/❌ | |
| OnPush en todos los componentes | ✅/❌ | |
| Effects funcionales | ✅/❌ | |
| input()/output() modernos | ✅/❌ | |
| No inline templates | ✅/❌ | |
| JSDoc en toSignal/computed | ✅/❌ | |

### Issues Encontrados

**CRITICAL** (bloquean archive):
Ninguno / lista

**WARNING** (recomendado corregir):
Ninguno / lista

**SUGGESTION**:
Ninguno / lista

### Veredicto
{PASS / PASS WITH WARNINGS / FAIL}
```

## Reglas

- Issues CRITICAL bloquean el paso a `sdd-archive`.
- No corregir issues en esta fase — solo reportar. El usuario decide qué hacer.
- Un scenario es COMPLIANT solo si hay código que lo implementa **y** existe un test que lo verifica.
- Si los tests E2E fallan, incluir el output en el reporte bajo "Issues Encontrados".
