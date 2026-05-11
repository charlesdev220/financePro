# SDD Spec — Paso 2

Escribe los casos de uso como tests de integración por flujo de datos.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Agente responsable

Orchestrator (inline) — sin delegar.

## Pre-requisito

Leer `.sdd/changes/{change-name}/1-init.md` (obligatorio).

## Qué hacer

1. Leer `1-init.md` → archivos afectados y cambio propuesto.
2. Identificar los flujos de negocio del cambio (ej: "Registrar un gasto", "Cargar carteras al iniciar").
3. Para cada flujo, escribir UCs que describan el recorrido del dato capa a capa.
4. UC de error path obligatorio — mín. 1 por flujo.
5. Guardar en `.sdd/changes/{change-name}/2-spec.md`.
6. Actualizar `state.md` → paso 2 completado, esperando aprobación.
7. **PARAR**. No avanzar sin aprobación del usuario.

## Un UC = test de integración, no Gherkin de usuario

Un UC describe el **recorrido del dato** desde que entra a la función hasta que llega
a su destino observable. Es verificable como test de integración end-to-end de capas.

## Estructura de `2-spec.md`

```markdown
# Spec: {change-name}

## Flujo: {Nombre del flujo de negocio}

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

## Ejemplo

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

## Reglas

- Agrupar los UCs por **flujo de negocio** — no por capa técnica.
- Cada UC describe el dato en movimiento: de dónde viene, por dónde pasa, dónde termina.
- Cada UC debe poder convertirse en un test de integración verificable.
- UCs de error path son obligatorios — mín. 1 por flujo.
- Sin código de implementación — solo comportamiento observable y recorrido de capas.
- **PARAR** al terminar. No avanzar sin aprobación del usuario.
