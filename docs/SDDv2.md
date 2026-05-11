# SDD v2 — Diseño (5 pasos)

## Diagnóstico del SDD legacy

| Problema | Impacto |
|----------|---------|
| 8 pasos lineales con demasiados artefactos | Fricción alta para cambios medianos |
| `explore.md` y `design.md` se saltaban silenciosamente | Trazabilidad rota entre sesiones |
| `archive` como paso separado | Burocracia al final cuando el dev ya cerró mentalmente |
| Tasks organizadas por "Phase 1/2/3" genéricas | No comunican el flujo de negocio del cambio |
| `apply` y testing desacoplados | Tests se escriben tarde, fuera del ciclo de feedback |
| Historiales en texto libre sin estructura | No buscables por agentes, lecciones se pierden |
| `project-map.json` no regenerado sistemáticamente | Agentes exploran el proyecto en lugar de consultar el mapa |
| Lecciones repetidas no se promueven a rules | Los mismos bugs se redescubren ciclo a ciclo |

---

## Nuevo flujo — 5 pasos

```
1-init → [PAUSA] → 2-spec → [PAUSA] → 3-task → [PAUSA] → 4-impl → [PAUSA] → 5-verify
```

Cada `[PAUSA]` es un punto de revisión explícito donde el usuario aprueba antes de continuar.

---

## Estructura de carpetas por cambio

```
.sdd/changes/{change-name}/
├── state.md            ← índice vivo, actualizado en cada paso
├── 1-init.md
├── 2-spec.md
├── 3-task.md
├── 4-impl-log.md
└── 5-verify-report.md
```

`state.md` no lleva numeral — es el índice del cambio, no un artefacto de fase.

---

## Sistema de memoria — tres depósitos

El SDD v2 alimenta y consume tres depósitos de memoria que evitan que los agentes
tengan que explorar el proyecto desde cero en cada sesión:

| Depósito | Archivo | Propósito | Quién lo lee | Quién lo escribe |
|----------|---------|-----------|-------------|-----------------|
| Estructural | `project-map.json` | Qué existe, dónde, cómo se conecta | `1-init` vía `prompt-enricher` | `5-verify` al archivar |
| Experiencial | `HISTORIAL_APRENDIZAJE.md` | Qué no repetir, bugs conocidos, ADRs informales | `1-init` (grep por contexto) | `5-verify` |
| Normativo | `.claude/rules/*.md` | Reglas arquitectónicas no negociables | Todos los agentes antes de generar código | `5-verify` cuando detecta patrón recurrente |

**Ciclo completo:**
```
5-verify → actualiza los tres depósitos
1-init   → consume los tres depósitos
Resultado: el agente llega con contexto preciso sin explorar
```

---

## Paso 1 — `1-init.md`

**Qué hace:** Consulta los depósitos de memoria, localiza los archivos afectados y propone el cambio.  
**Quién lo ejecuta:** Orchestrator (inline).  
**Artefacto:** `1-init.md`

### Protocolo de consulta de memoria (antes de proponer)

1. Leer `project-map.json` → `_index` (~100 tokens) para mapear términos del dominio a archivos.
2. Grep `HISTORIAL_APRENDIZAJE.md` por los servicios/archivos afectados → lecciones relevantes.
3. Identificar las rules de `.claude/rules/` de las capas que el cambio toca.
4. Con esa información, proponer el cambio sin exploración amplia (máx. 5 archivos leídos).

### Estructura de `1-init.md`

```markdown
# Init: {change-name}

## Propósito
{Una frase: qué problema resuelve este cambio y para quién.}

## Archivos afectados
| Archivo | Motivo |
|---------|--------|
| `src/app/store/transactions/transactions.effects.ts` | Agrega efecto de carga con ETag |

## Lecciones previas relevantes
| Lección | Historial | Aplicación en este cambio |
|---------|-----------|--------------------------|
| `parseNum()` — guard contra NaN en rowToTransaction | APREND-012 | Verificar mapeo de columna `amount` |

## Cambio propuesto
{Descripción técnica del cambio: qué se agrega, modifica o elimina. Sin código.}

## Alternativas descartadas
- {Alternativa} → {Motivo de descarte}

## Riesgos identificados
- {Riesgo} → {Mitigación}

## Dependencias
- Requiere que {X} esté implementado primero / Sin dependencias externas.
```

### Reglas del paso 1

- Consultar `project-map.json` primero — no explorar el proyecto manualmente.
- Grep `HISTORIAL_APRENDIZAJE.md` por los servicios afectados antes de proponer.
- Leer máx. 5 archivos de código (los que el cambio toca directamente).
- Si el cambio tiene más de 5 archivos afectados → señalarlo bajo "Riesgos" y sugerir split.
- `1-init.md` reemplaza tanto `explore.md` como `proposal.md` del SDD legacy.
- Si el propósito no cabe en una frase → el cambio es demasiado grande, sugerir split.
- **PARAR** al terminar. No avanzar sin aprobación del usuario.

---

## Paso 2 — `2-spec.md`

**Qué hace:** Escribe los casos de uso como tests de integración por flujo de datos.  
**Quién lo ejecuta:** Orchestrator (inline).  
**Artefacto:** `2-spec.md`

### UC = test de integración, no Gherkin de usuario

Un UC describe el **recorrido del dato** desde que entra a la función hasta que llega
a su destino observable. Es verificable como test de integración end-to-end de capas.

### Estructura de `2-spec.md`

```markdown
# Spec: {change-name}

## Flujo: {Nombre del flujo de negocio}
<!-- Ejemplo: "Registrar un gasto", "Cargar carteras al iniciar", "Filtrar por categoría" -->

### UC-01 — {Título del recorrido happy path}

**Entrada:** `{Acción o llamada que dispara el flujo}`
**Recorrido:**
1. {Capa 1}: {qué hace y qué produce}
2. {Capa 2}: {qué recibe y qué produce}
3. {Capa N}: {resultado final observable}

**Salida esperada:** {Qué ve el usuario o qué estado queda en el store}

---

### UC-02 — {Título del error path o edge case}

**Entrada:** `{Misma acción, condición de fallo}`
**Recorrido:**
1. {Capa 1}: {qué falla y cómo}
2. {catchError / manejo defensivo}: {qué dispara}
3. {Template}: {qué muestra al usuario}

**Salida esperada:** {Estado sin mutar + mensaje de error visible}
```

### Ejemplo concreto

```markdown
## Flujo: Registrar un gasto

### UC-01 — Dispatch → Effect → Sheets → Reducer → Selector → Template

**Entrada:** `TransactionsActions.saveTransaction({ transaction })`
**Recorrido:**
1. Effect intercepta `saveTransaction` → llama `SheetsApiService.appendRow()`
2. Sheets devuelve 200 → Effect dispara `saveTransactionSuccess({ transaction })`
3. Reducer añade la transacción al array `state.transactions`
4. Selector `selectAllTransactions` emite lista actualizada
5. `computed()` en el componente recalcula el balance
6. Template refleja la nueva transacción en la lista y el balance actualizado

**Salida esperada:** Transacción visible en lista + balance actualizado + toast "Gasto registrado"

---

### UC-02 — Error path: Sheets falla con 403

**Entrada:** `TransactionsActions.saveTransaction({ transaction })`
**Recorrido:**
1. Effect llama `SheetsApiService.appendRow()` → Sheets responde 403
2. `catchError` dentro del `switchMap` → dispara `saveTransactionFailure({ error: 'Sin permiso...' })`
3. Reducer setea `state.error`
4. Selector `selectTransactionsError` emite el mensaje
5. Template muestra toast `danger` con el mensaje de error

**Salida esperada:** Estado no muta + toast de error visible al usuario
```

### Reglas del paso 2

- Agrupar los UCs por **flujo de negocio** (no por capa técnica).
- Cada UC describe el dato en movimiento: de dónde viene, por dónde pasa, dónde termina.
- Cada UC debe poder convertirse en un test de integración verificable.
- UCs de error path son obligatorios — mín. 1 por flujo.
- Sin código de implementación — solo comportamiento observable y recorrido de capas.
- **PARAR** al terminar. No avanzar sin aprobación del usuario.

---

## Paso 3 — `3-task.md`

**Qué hace:** Genera las tareas de implementación organizadas por flujo de datos.  
**Quién lo ejecuta:** Orchestrator (inline).  
**Artefacto:** `3-task.md`

### Organización por flujo de datos

Las tareas se organizan por el **flujo de datos** que implementan, no por fases genéricas.
Cada flujo corresponde a un UC de `2-spec.md`. El orden dentro del flujo sigue la
dependencia real del dato: modelos → store → service → component → template → test.

### Estructura de `3-task.md`

```markdown
# Tasks: {change-name}

## Flujo: {Nombre del flujo — mismo que en 2-spec.md}

### Datos involucrados
{Qué modelo/entidad entra, qué transita por qué capa, qué sale al usuario.}
<!-- Ejemplo: Transaction → effects → reducer → selector → computed() → template -->

### Tareas

- [ ] T-01 · Model:     {Qué interface o type cambia en `models/`}
- [ ] T-02 · Store:     {Qué action/reducer/effect/selector agregar o modificar}
- [ ] T-03 · Service:   {Qué lógica de negocio en service}
- [ ] T-04 · Component: {Qué page o component consume los datos}
- [ ] T-05 · Template:  {Qué binding o control flow agrega/cambia en el HTML}
- [ ] T-06 · Test:      UC-01 — {Descripción del test que verifica este UC}
- [ ] T-07 · Test:      UC-02 — {Test del error path}

## Flujo: {Segundo flujo si aplica}
...
```

### Reglas del paso 3

- Cada tarea referencia la **capa** que toca: Model / Store / Service / Component / Template / Test.
- Los tests son tareas de primer nivel dentro del flujo — no una phase separada al final.
- Cada tarea `Test` referencia explícitamente el UC de `2-spec.md` que verifica.
- El orden respeta la dependencia real del dato dentro de cada flujo.
- Una tarea = un archivo o una unidad lógica cohesiva. Si es más, dividir.
- Tareas vagas como "implementar feature" o "agregar tests" son inválidas.
- **PARAR** al terminar. No avanzar sin aprobación del usuario.

---

## Paso 4 — `4-impl-log.md`

**Qué hace:** Implementa las tareas del `3-task.md` y escribe/ejecuta los tests del spec.  
**Quién lo ejecuta:** `develop-expert` (código de producción) + `qa-automation` (tests).  
**Artefactos:** código, marcas `[x]` en `3-task.md`, `4-impl-log.md`

### Protocolo

1. Leer `1-init.md` → contexto, archivos afectados y lecciones previas.
2. Leer `2-spec.md` → criterios de aceptación por flujo.
3. Leer `3-task.md` → qué implementar, en qué orden.
4. Leer **el código actual** de cada archivo afectado — nunca asumir estado.
5. Consultar la rule de capa correspondiente en `.claude/rules/` antes de cada archivo.
6. Implementar en orden de dependencias dentro de cada flujo.
7. Marcar cada tarea al completarla: `- [ ]` → `- [x]` en `3-task.md`.
8. Si la implementación se desvía de `1-init.md` → documentar en `4-impl-log.md`.

### Delegación de agentes

| Tipo de tarea | Agente | Rules obligatorias |
|---|---|---|
| Models, NgRx (actions/reducer/effects/selectors) | `develop-expert` | `typescript.md` · `ngrx.md` |
| Components, Pages, Templates | `develop-expert` | `angular.md` · `html.md` · `ionic.md` · `tailwind.md` · `ux-ui.md` |
| Sheets API, cifrado PII | `develop-expert` | `sheets-api.md` |
| Tests unitarios (Karma/Jasmine) | `qa-automation` | `typescript.md` · `angular.md` · `ngrx.md` |
| Tests E2E (Playwright) | `playwright-inspector` | `ux-ui.md` · `ionic.md` |
| Build, CI/CD, secrets | `devops-cloud` | `CLAUDE.md` sección Stack |

### Estructura de `4-impl-log.md`

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

### Reglas del paso 4

- Un agente no escribe código sin haber leído la rule de su capa.
- Si un requerimiento contradice una rule → escalar al orchestrator antes de proceder.
- Cero `TODO`, `FIXME`, `MOCK` — todo entregado debe ser funcional.
- `templateUrl` obligatorio — prohibido `template:` inline.
- Los tests se escriben en la misma iteración que el código que verifican, no al final.
- **PARAR** al terminar. Mostrar resumen `[x]` completadas vs `[ ]` pendientes. No avanzar sin aprobación.

---

## Paso 5 — `5-verify-report.md`

**Qué hace:** Verifica la implementación, cierra los tres depósitos de memoria y archiva.  
**Quién lo ejecuta:** `qa-automation` (compliance + tests) + `playwright-inspector` (E2E visual).  
**Artefactos:** `5-verify-report.md`, entradas en historiales, promoción a rules si aplica, regeneración de `project-map.json`, archive.

### A. Completeness

- Todas las tareas en `3-task.md` marcadas `[x]`.
- El propósito declarado en `1-init.md` se puede declarar como cumplido.

### B. Spec compliance

- Para cada UC en `2-spec.md`, existe evidencia en el código **y** un test que lo verifica.
- UCs de error path tienen su correspondiente manejo en effects/componentes.

### C. Architecture compliance

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

### D. Actualizar `HISTORIAL_APRENDIZAJE.md` (con tags estructurados)

Formato grep-friendly — permite a `1-init` encontrar lecciones relevantes por contexto:

```markdown
### [APREND-{NNN}] {Título breve}
**Contexto:** `{archivo}` · {clase/servicio} · {método si aplica}
**Patrón:** {bug | decision | warning | performance}
**Síntoma:** {qué se observó}
**Causa:** {por qué ocurrió}
**Fix:** {qué lo resolvió}
**Promovido a rule:** `{archivo:línea}` / No
```

### E. Actualizar `HISTORIAL_IMPLEMENTACION.md`

```markdown
### Qué hemos completado hasta ahora ({Título}):
*Fase actual:* Fase X: ...
*Estado actual:* Completado
- ✔️ **{Nombre}:** {Descripción técnica en 1 línea}
*Archivos modificados:* `{archivo1}`, `{archivo2}` ← permite grep futuro
*Deuda técnica documentada:* {...}
*Próximos pasos:* {...}
```

### F. Detección de patrones → promoción a rules

Cuando verify encuentra un WARNING o CRITICAL, pregunta:
**¿Este patrón ya apareció en `HISTORIAL_APRENDIZAJE.md` antes?**

```
Si el mismo patrón aparece 2+ veces en el historial:
→ Promover a .claude/rules/{capa}.md como regla explícita
→ Actualizar la entrada del historial: "Promovido a rule: sheets-api.md línea XX"
→ Registrar en 5-verify-report.md bajo "Reglas promovidas"
```

Esto convierte lecciones repetidas en memoria **normativa** (rules) en lugar de
quedarse como memoria **experiencial** (historial) que se ignora.

### G. Actualizar `project-map.json`

Siempre, si el veredicto es PASS o PASS WITH WARNINGS.

Solo se actualizan los nodos tocados por el cambio — no se re-parsea todo el proyecto.
Los archivos afectados están listados en `4-impl-log.md`.

```bash
npx tsx frontend/tools/generate-project-map.ts --files archivo1.ts,archivo2.ts
```

Si el script falla → el archive no está completo.

### H. Archive

Mover `.sdd/changes/{change-name}/` a `.sdd/changes/archive/{change-name}/`.  
Actualizar `state.md` → `Estado: Completado`.

### Estructura de `5-verify-report.md`

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
| ... | | |

## Issues

**CRITICAL** (bloquean archive):
Ninguno / lista

**WARNING** (recomendado corregir):
Ninguno / lista

## Reglas promovidas (F)
| Patrón | Historial | Rule actualizada |
|--------|-----------|-----------------|
| {descripción} | APREND-012 | `sheets-api.md:45` |

## Veredicto
{PASS / PASS WITH WARNINGS / FAIL}
```

### Reglas del paso 5

- Issues CRITICAL bloquean el archive.
- No corregir issues en esta fase — solo reportar. El usuario decide.
- El historial se actualiza **solo** si el veredicto es PASS o PASS WITH WARNINGS.
- `project-map.json` se regenera siempre antes del archive.
- Archive es la última acción de este paso — no un paso separado.

---

## `state.md` — formato estándar

Creado en el paso 1, actualizado al completar cada paso.

```markdown
# State: {change-name}

**Creado:** {fecha}
**Última actualización:** {fecha}

## Estado actual
**Paso:** {número y nombre}
**Estado:** En proceso / Esperando aprobación / Completado

## Progreso
- [x] 1-init   — Completado {fecha} · archivos afectados: 4 · riesgos: 1
- [x] 2-spec   — Completado {fecha} · flujos: 2 · UCs: 5
- [x] 3-task   — Esperando aprobación · tareas: 12
- [ ] 4-impl   — Pendiente
- [ ] 5-verify — Pendiente

## Artefactos generados
| Archivo | Paso | Estado |
|---------|------|--------|
| `1-init.md`          | 1 | ✅ |
| `2-spec.md`          | 2 | ✅ |
| `3-task.md`          | 3 | ⏳ esperando aprobación |
| `4-impl-log.md`      | 4 | pendiente |
| `5-verify-report.md` | 5 | pendiente |

## Historial de decisiones
- {fecha} · Paso 1: Se identificaron 4 archivos afectados. Riesgo: ETag puede invalidar caché.
- {fecha} · Paso 3: Se agregó tarea T-08 no prevista en init: actualizar `selectTotalBalance`.
```

---

## Resumen comparativo

| Aspecto | SDD legacy (8 pasos) | SDD v2 (5 pasos) |
|---------|---------------------|-----------------|
| Pasos | explore → propose → spec → design → tasks → apply → verify → archive | init → spec → task → impl → verify |
| Artefactos | 8 archivos mínimos | 6 archivos (`state.md` + 5 numerados) |
| Design separado | Siempre (incluso si redundante) | Absorbido en `1-init.md` |
| Archive separado | Siempre | Última acción del paso 5 |
| Organización de tareas | Phases genéricas (1/2/3) | Flujos de datos de negocio |
| Tests en tasks | Phase 4 al final | Tarea inline del flujo |
| UCs | Gherkin de usuario | Test de integración por recorrido de dato |
| Revisión de usuario | Tras propose y tras tasks | Tras cada uno de los 5 pasos |
| Historial | Texto libre | Tags estructurados (grep-friendly) |
| Lecciones recurrentes | Se repiten ciclo a ciclo | Se promueven a `.claude/rules/` |
| `project-map.json` | Sin actualización sistemática | Nodos afectados actualizados en cada archive |

---

## Comandos

```
/sdd-init   <change-name>  → Paso 1: consultar memoria + recolectar + proponer
/sdd-spec   <change-name>  → Paso 2: casos de uso como tests de integración
/sdd-task   <change-name>  → Paso 3: tareas por flujo de datos
/sdd-impl   <change-name>  → Paso 4: implementar + testear inline
/sdd-verify <change-name>  → Paso 5: verificar + memoria + archive
```

**Meta-comandos:**
```
/sdd-new      <change-name>  → paso 1, pausa
/sdd-continue <change-name>  → leer state.md, ejecutar siguiente paso
```
