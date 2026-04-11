# SDD Verify

Valida que la implementación cumple con las specs.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Pre-requisitos
Leer `.sdd/changes/{change-name}/spec.md` y `tasks.md` (ambos obligatorios).  
Leer el código implementado.

## Qué hacer

1. **Completeness:** Verificar que todas las tareas en `tasks.md` estén marcadas `[x]`.
2. **Correctness (estático):** Para cada requirement en `spec.md`, buscar evidencia en el código.
3. **Testing:** Verificar que existen tests para cada scenario del spec.
4. **Coherence:** Verificar que el código sigue las decisiones del `design.md`.
5. Guardar en `.sdd/changes/{change-name}/verify-report.md`.
6. Actualizar `state.md` → fase: `verify`.
7. Si te encuentras issues corrigelas y notificalas

## Formato de `verify-report.md`

```markdown
## Verification Report: {change-name}

### Completeness
| Metric | Value |
|--------|-------|
| Total tasks | {N} |
| Complete [x] | {N} |
| Pending [ ] | {N} |

### Spec Compliance Matrix
| Requirement | Scenario | Evidence (file:line) | Status |
|-------------|----------|---------------------|--------|
| REQ-01 | {scenario} | `path/to/test.java:42` | ✅ COMPLIANT |
| REQ-02 | {scenario} | (no test found) | ❌ UNTESTED |

### Architecture Compliance
| Rule | Status | Notes |
|------|--------|-------|
| Hexagonal layers backend | ✅/❌ | |
| Standalone components Angular | ✅/❌ | |
| Contract-First (OpenAPI updated) | ✅/❌ | |
| No @Autowired field injection | ✅/❌ | |
| Pageable en colecciones | ✅/❌ | |

### Issues Found

**CRITICAL** (bloquean archive):
{Ninguno / lista}

**WARNING** (recomendado corregir):
{Ninguno / lista}

**SUGGESTION**:
{Ninguno / lista}

### Verdict
{PASS / PASS WITH WARNINGS / FAIL}
```

## Reglas
- CRITICAL issues bloquean el paso a `sdd-archive`.
- No corregir issues en esta fase — solo reportar. El usuario decide qué hacer.
- Un scenario solo es COMPLIANT si hay código que lo implementa Y existe un test que lo verifica.