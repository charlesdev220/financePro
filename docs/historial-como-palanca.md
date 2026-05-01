# Historiales como Palanca de Mejora

> Cómo usar `HISTORIAL_APRENDIZAJE.md` y `HISTORIAL_IMPLEMENTACION.md`
> para mejorar la calidad y velocidad de las implementaciones futuras.

---

## El problema que resuelven los historiales

Sin registro explícito de lo aprendido, los mismos errores se repiten ciclo a ciclo:

- El mock del test devuelve `[]` y dispara `_createDefault()` de nuevo → bug que ya se resolvió
- `Number('')` devuelve `0` y `Number('abc')` devuelve `NaN` → guard `isNaN` olvidado una vez más
- `@Input()` legacy en lugar de `input()` signal-based porque Ionic `ModalController` no es compatible → redescobrimiento costoso

El historial convierte esos "re-descubrimientos" en lookups de 30 segundos.

---

## Los dos archivos y su propósito

| Archivo | Propósito | Cuándo leerlo |
|---------|-----------|--------------|
| `HISTORIAL_IMPLEMENTACION.md` | **Qué se hizo** — lista de features, fixes y decisiones técnicas por SDD | Al iniciar un SDD que toca las mismas features o servicios |
| `HISTORIAL_APRENDIZAJE.md` | **Qué aprendimos** — lecciones extraídas de bugs, sorpresas y decisiones no obvias | Al empezar cualquier SDD — especialmente en el `sdd-explore` |

---

## Ritual: Pre-SDD de 5 minutos

Antes de abrir `sdd-propose`, hacer este chequeo:

### Paso 1 — Identificar el contexto del cambio

Responder estas preguntas:
- ¿Qué state services toca este cambio? (TransactionsState, BudgetsState, etc.)
- ¿Toca el schema de Sheets? ¿Agrega columnas?
- ¿Incluye tests? ¿Mocks de servicios?
- ¿Modifica modales de Ionic?

### Paso 2 — Buscar en `HISTORIAL_APRENDIZAJE.md`

Leer las últimas 3–5 entradas. Preguntar:
- ¿Hay una lección sobre alguno de los servicios que voy a modificar?
- ¿Hay un bug previo relacionado con el tipo de operación (parse, mock, signals)?
- ¿Hay una decisión arquitectónica (ADR) que me afecta?

**Señales de alerta a buscar:**

| Si el cambio toca... | Revisar lección sobre... |
|----------------------|--------------------------|
| Parsers de Sheets (`rowToX`) | `parseNum()` — guard contra NaN/Infinity |
| Tests con mocks de state services | Segunda llamada al mock — recursión de `_createDefault()` |
| Modales de Ionic con datos | `@Input()` legacy vs `input()` signal-based |
| BUDGETS / `spent_amount` | Dato stale — recalcular desde txs en memoria |
| Nuevas columnas en Sheets | ADR-03: `workspace_id` al final. ADR-05: `|| defaultWsId` |
| Signals en templates | `.set()` / `.update()` nunca en el HTML directamente |
| Chart.js + altura | `h-full` en lugar de variables CSS no definidas |

### Paso 3 — Buscar en `HISTORIAL_IMPLEMENTACION.md`

Buscar SDDs previos que hayan tocado los mismos archivos. Responder:
- ¿Qué deuda técnica quedó documentada en esos SDDs?
- ¿Hay un `_Próximos pasos_` que quedó sin implementar y que este SDD puede resolver?
- ¿El diseño que voy a proponer contradice alguna decisión anterior?

---

## Cómo extraer patrones de los historiales

### Patrón 1 — Bugs recurrentes

Si una lección aparece más de una vez, es un patrón de error estructural.
Acción: moverlo a `.claude/rules/` como regla explícita.

**Ejemplo real:**
> `parseNum()` aparece en `bugfix-nan-chart-budget-fab` y en `workspace-and-product-roadmap`.
> → Codificado en `.claude/rules/sheets-api.md` como regla de mapeo de filas.

### Patrón 2 — Decisiones de diseño acumuladas

Las entradas de `HISTORIAL_IMPLEMENTACION.md` con `*Deuda técnica documentada*` son backlog implícito.
Revisarlas al planificar nuevas features puede revelar trabajo pendiente de alto valor.

**Cómo explotar este patrón:**
1. Al abrir un SDD nuevo, grep por `Deuda técnica documentada` en el historial
2. Si alguna deuda es relevante para el cambio actual, incluirla en el `proposal.md`
3. Si no es relevante ahora, crear una tarea en el backlog explícito

### Patrón 3 — ADRs implícitos

Algunas lecciones son, en realidad, ADRs no formalizados. Identificarlos y documentarlos
en `design.md` del próximo SDD los hace visibles para otros agentes.

**Señal:** Lección que dice "nunca hacer X" o "siempre hacer Y en Z contexto".
**Acción:** Promoverla a ADR en el próximo `sdd-design`.

### Patrón 4 — Secuencias de error → solución

Muchas lecciones describen: *sintoma → causa raíz → fix*. Este patrón es útil como
**checklist de diagnóstico** para bugs futuros similares.

**Ejemplo:**
```
Síntoma:  NaN% en presupuesto
Causa:    spent_amount leído de Sheets (stale) en lugar de calculado desde txs
Fix:      computed() que reduce transactions por category_id
```

---

## Cómo mantener los historiales vivos

### Regla de calidad para `HISTORIAL_APRENDIZAJE.md`

Una entrada útil responde tres preguntas:
1. **¿Qué?** — Descripción técnica concisa de lo aprendido
2. **¿Por qué?** — El bug o situación que lo provocó
3. **¿Dónde?** — Archivo y contexto específico

Una entrada inútil es vaga: *"aprendimos que los tests son importantes"* — no permite buscar ni aplicar.

### Regla de calidad para `HISTORIAL_IMPLEMENTACION.md`

Una entrada útil incluye:
- Lista explícita de archivos modificados (permite greppear)
- Deuda técnica con razón (no solo "TODO: X", sino "X está pendiente porque Y")
- Próximos pasos accionables (verbo + objeto + contexto)

### Anti-patrones a evitar

| Anti-patrón | Por qué es dañino |
|-------------|-------------------|
| Entradas genéricas ("se implementó el módulo") | No buscables, no accionables |
| Lecciones sin contexto de archivo | No se puede verificar si sigue vigente |
| Historial sin consultar al iniciar SDDs | El valor se acumula pero nunca se usa |
| Actualizar solo al archivar un SDD | Las lecciones se olvidan entre fases |

---

## Integración con el flujo SDD

```
sdd-explore
  └── Leer HISTORIAL_APRENDIZAJE → identificar lecciones relevantes
  └── Leer HISTORIAL_IMPLEMENTACION → identificar deuda técnica relacionada
  └── Documentar hallazgos en explore.md → "Lecciones previas a considerar"

sdd-design
  └── Si una lección se convierte en ADR → documentarlo en design.md

sdd-apply
  └── Verificar activamente contra las lecciones del explore
  └── Si aparece un nuevo aprendizaje durante apply → agregarlo YA a HISTORIAL_APRENDIZAJE

sdd-archive
  └── Actualizar HISTORIAL_IMPLEMENTACION con el estado final
  └── Actualizar HISTORIAL_APRENDIZAJE con lecciones del ciclo
  └── Revisar si alguna lección nueva merece ser promovida a rule en .claude/rules/
```

---

## Checklist de consulta rápida

Al iniciar un SDD, responder estas preguntas con los historiales abiertos:

- [ ] ¿Hay lecciones previas sobre los servicios que voy a modificar?
- [ ] ¿Hay deuda técnica documentada en SDDs anteriores relacionada con este cambio?
- [ ] ¿Hay bugs recurrentes que debería evitar proactivamente?
- [ ] ¿Alguna lección implica un ADR que debo respetar en el design?
- [ ] ¿Hay `Próximos pasos` sin implementar en SDDs anteriores relevantes?
